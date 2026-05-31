// ── Imports ───────────────────────────────────────────────
import Anthropic from "@anthropic-ai/sdk";                              // Anthropic SDK client
import { eq } from "drizzle-orm";                                       // Drizzle equality operator for where clauses
import * as schema from "@/db/schema";                                  // table definitions
import type { Db } from "@/db/index";                                   // DB type from factory

// ── Channel priority ──────────────────────────────────────
// Order determines which source Claude prefers when a duplicate spans channels.
// Stakeholder gate: edit this array to change channel preference without touching the prompt.
export const CHANNEL_PRIORITY = ["airbnb", "direct", "booking_com", "vrbo"] as const; // ordered channel preference

// ── Tool definitions ──────────────────────────────────────
// Defines the tools Claude can call during analysis.
// Stakeholder gate: add fields to input_schema here if more context is needed.
export const RECONCILIATION_TOOLS: Anthropic.Tool[] = [
  {
    name: "get_booking_details",                                        // tool identifier
    description: "Fetch full details for a booking by ID, including the channel source.",  // Claude reads this
    input_schema: {
      type: "object" as const,                                          // required literal for SDK
      properties: {
        booking_id: { type: "string", description: "UUID of the booking" }, // single parameter
      },
      required: ["booking_id"],                                         // booking_id is mandatory
    },
  },
  {
    name: "get_property_info",                                          // tool identifier
    description: "Fetch property details including the base nightly rate.",  // Claude reads this
    input_schema: {
      type: "object" as const,                                          // required literal for SDK
      properties: {
        property_id: { type: "string", description: "UUID of the property" }, // single parameter
      },
      required: ["property_id"],                                        // property_id is mandatory
    },
  },
  {
    name: "propose_resolution",                                         // tool identifier
    description: "Submit your proposed resolution after completing analysis. Call this exactly once.", // Claude reads this
    input_schema: {
      type: "object" as const,                                          // required literal for SDK
      properties: {
        action: {
          type: "string",                                               // free text action
          description: "Specific action to take. Name exact booking IDs. E.g. 'Cancel Booking.com reservation BCO-284 and mark this flag resolved.'",
        },
        confidence: {
          type: "integer",                                              // integer 0–100
          minimum: 0,                                                   // lowest possible confidence
          maximum: 100,                                                 // highest possible confidence
          description: "Your confidence in this resolution (0–100). Count matching evidence fields vs counter-evidence.",
        },
        reasoning_summary: {
          type: "string",                                               // brief text
          description: "One to three sentences summarising your reasoning. Shown to the operator.",
        },
      },
      required: ["action", "confidence", "reasoning_summary"],         // all three are mandatory
    },
  },
];

// ── System prompt ─────────────────────────────────────────
// Stakeholder gate: edit this constant to change Claude's behaviour without touching routes or components.
export const RECONCILIATION_AGENT_SYSTEM_PROMPT = `
You are an AI reconciliation agent for a vacation rental property management system.
Your job is to analyse booking conflicts and propose a specific, actionable resolution.

Process for every conflict:
1. Call get_booking_details for each booking ID provided
2. Call get_property_info if you need the base nightly rate (price_mismatch or gap conflicts)
3. Reason step-by-step: count matching fields, note any counter-evidence, consider the conflict type
4. Estimate your confidence (0–100): high evidence + low counter-evidence = high confidence
5. Call propose_resolution exactly once with your action, confidence score, and a brief summary

Conflict type guidance:
- duplicate: same guest name + identical dates across channels = cancel the later-imported one. Prefer channels in this order: ${CHANNEL_PRIORITY.join(" > ")}. Confidence ≥90 if guest name and dates both match exactly.
- double_book: overlapping dates, different guests = check which booking is cancellable; if unclear, confidence ≤70 and say "recommend manual review"
- price_mismatch: compare nightly_rate to property base_rate; calculate % deviation. >25% = flag. Include the deviation % in your reasoning.
- gap: calculate gap length in nights × property base_rate = revenue opportunity. State the $ amount.

Be specific. Name the exact booking ID in your action. Do not hedge with "consider" or "may want to". Say what should happen.
`.trim(); // trim removes leading/trailing whitespace from the template literal

// ── Custom event types emitted to the client ──────────────
// These are our own simplified events, NOT raw Anthropic SDK events.
type StreamEvent =
  | { type: "text"; content: string }                                   // text token from Claude
  | { type: "tool_call_start"; name: string }                           // tool being called — shown as chip
  | { type: "proposal"; action: string; confidence: number; reasoningSummary: string } // final proposal
  | { type: "done" };                                                   // stream complete

// ── DB helper: fetch booking details ──────────────────────
async function getBookingDetails(db: Db, bookingId: string): Promise<object> {
  const row = await db                                                  // query bookings table
    .select({
      id:            schema.bookings.id,                                // booking UUID
      propertyId:    schema.bookings.propertyId,                        // property UUID — needed for get_property_info
      guestName:     schema.bookings.guestName,                         // guest full name
      checkIn:       schema.bookings.checkIn,                           // arrival date YYYY-MM-DD
      checkOut:      schema.bookings.checkOut,                          // departure date YYYY-MM-DD
      gross:         schema.bookings.gross,                             // total booking value
      nightlyRate:   schema.bookings.nightlyRate,                       // per-night rate (used for price_mismatch)
      source:        schema.bookings.channelName,                       // channel name — used for channel priority
      channelName:   schema.bookings.channelName,                       // same field, explicit label for Claude
      sourceRowHash: schema.bookings.sourceRowHash,                     // import dedup hash — confirms cross-channel duplicate
      status:        schema.bookings.status,                            // confirmed|cancelled|pending
    })
    .from(schema.bookings)
    .where(eq(schema.bookings.id, bookingId))                           // filter to this booking
    .limit(1)                                                           // expect at most one row
    .then((rows) => rows[0]);                                           // unwrap array to single row
  return row ?? { error: `booking ${bookingId} not found` };           // return error object if missing
}

// ── DB helper: fetch property info ────────────────────────
async function getPropertyInfo(db: Db, propertyId: string): Promise<object> {
  const row = await db                                                  // query properties table
    .select({
      id:       schema.properties.id,                                   // property UUID
      name:     schema.properties.name,                                 // property display name
      address:  schema.properties.address,                              // full address
      baseRate: schema.properties.baseRate,                             // standard nightly rate — used for price_mismatch + gap
      capacity: schema.properties.capacity,                             // max guest count
    })
    .from(schema.properties)
    .where(eq(schema.properties.id, propertyId))                        // filter to this property
    .limit(1)                                                           // expect at most one row
    .then((rows) => rows[0]);                                           // unwrap array
  return row ?? { error: `property ${propertyId} not found` };         // return error object if missing
}

// ── resolveFlag: named export for RBAC seam ───────────────
// Stakeholder gate: add authorisation check here when multi-user is added — routes don't change.
export async function resolveFlag(
  db: Db,                                                               // Drizzle DB instance
  flagId: string,                                                       // UUID of flag to resolve
  proposedAction: string,                                               // resolution text to store
  acceptedBy: string = "operator",                                      // who accepted — defaults to "operator"
): Promise<void> {
  await db                                                              // run the update
    .update(schema.reconciliationFlags)                                 // target table
    .set({
      status:     "resolved",                                           // mark as resolved
      resolution: proposedAction,                                       // store the accepted action text
      resolvedAt: new Date(),                                           // record resolution timestamp
      acceptedBy,                                                       // audit: who clicked Accept
      acceptedAt: new Date(),                                           // audit: when Accept was clicked
    })
    .where(eq(schema.reconciliationFlags.id, flagId));                  // filter to this flag only
}

// ── streamAnalysis: full agentic loop server-side ─────────
// Handles multi-turn tool calling entirely on the server.
// Emits simplified StreamEvent objects (not raw SDK events) as newline-delimited JSON.
export async function streamAnalysis(
  flag: { id: string; type: string; reason: string | null; bookingIds: string[] }, // flag to analyse
  db: Db,                                                               // DB for tool calls
): Promise<ReadableStream<string>> {
  const client = new Anthropic();                                       // SDK reads ANTHROPIC_API_KEY from env

  return new ReadableStream<string>({
    async start(controller) {
      const emit = (obj: StreamEvent) =>                                // helper: serialise and enqueue event
        controller.enqueue(JSON.stringify(obj) + "\n");                 // newline-delimited JSON for client parsing

      const messages: Anthropic.MessageParam[] = [                     // conversation history for multi-turn
        {
          role: "user",                                                 // operator turn
          content:
            `Analyse this reconciliation flag and propose a resolution.\n\n` +
            `Flag ID: ${flag.id}\n` +                                   // flag UUID
            `Type: ${flag.type}\n` +                                    // conflict category
            `Involved booking IDs: ${flag.bookingIds.join(", ")}\n` +   // all booking UUIDs to inspect
            `Rule-based reason: ${flag.reason ?? "none"}`,              // existing plain-English reason
        },
      ];

      let continueLoop = true;                                          // loop until proposal or end_turn

      while (continueLoop) {
        const stream = client.messages.stream({                         // start a streaming API call
          model:   "claude-opus-4-8",                                   // Opus for best reasoning quality
          max_tokens: 1024,                                             // cap response length
          system:  RECONCILIATION_AGENT_SYSTEM_PROMPT,                  // domain instructions + tool guidance
          tools:   RECONCILIATION_TOOLS,                                // tools Claude can call
          messages,                                                     // full conversation history
        });

        const toolUseBlocks: Array<{                                    // tool calls accumulated this turn
          id: string;                                                   // correlation ID for tool result
          name: string;                                                 // tool name for routing
          input: string;                                                // accumulated partial JSON string
        }> = [];
        let currentToolId    = "";                                      // ID of tool currently receiving input
        let currentToolName  = "";                                      // name of tool currently receiving input
        let currentToolInput = "";                                      // accumulated JSON for current tool

        for await (const event of stream) {                            // iterate all SDK events
          if (event.type === "content_block_start" && event.content_block.type === "tool_use") {
            currentToolId    = event.content_block.id;                  // record tool call ID
            currentToolName  = event.content_block.name;               // record tool name
            currentToolInput = "";                                      // reset input buffer
            emit({ type: "tool_call_start", name: currentToolName });  // show chip in the client UI
          } else if (event.type === "content_block_delta") {
            if (event.delta.type === "text_delta") {
              emit({ type: "text", content: event.delta.text });        // forward text token to client
            } else if (event.delta.type === "input_json_delta") {
              currentToolInput += event.delta.partial_json;             // accumulate partial JSON input
            }
          } else if (event.type === "content_block_stop" && currentToolName) {
            toolUseBlocks.push({                                        // finalise this tool call
              id:    currentToolId,                                     // correlation ID
              name:  currentToolName,                                   // tool name
              input: currentToolInput,                                  // complete JSON string
            });
            currentToolId    = "";                                      // reset for next tool
            currentToolName  = "";                                      // reset for next tool
            currentToolInput = "";                                      // reset buffer
          }
        }

        const finalMessage = await stream.finalMessage();              // get the complete message object

        if (finalMessage.stop_reason !== "tool_use" || toolUseBlocks.length === 0) {
          continueLoop = false;                                         // no tools called — Claude finished
          break;
        }

        messages.push({ role: "assistant", content: finalMessage.content }); // add Claude's turn to history

        const toolResults: Anthropic.ToolResultBlockParam[] = [];      // results to return to Claude

        for (const toolCall of toolUseBlocks) {
          const input = JSON.parse(toolCall.input || "{}");            // parse accumulated JSON input

          let result: object;
          if (toolCall.name === "get_booking_details") {
            result = await getBookingDetails(db, (input as { booking_id: string }).booking_id); // DB lookup
          } else if (toolCall.name === "get_property_info") {
            result = await getPropertyInfo(db, (input as { property_id: string }).property_id); // DB lookup
          } else if (toolCall.name === "propose_resolution") {
            const inp = input as { action: string; confidence: number; reasoning_summary: string };
            emit({ type: "proposal", action: inp.action, confidence: inp.confidence, reasoningSummary: inp.reasoning_summary }); // emit proposal to client
            result       = { success: true };                          // acknowledge the tool call
            continueLoop = false;                                      // proposal received — stop the loop
          } else {
            result = { error: `unknown tool: ${toolCall.name}` };     // unknown tool — return error
          }

          toolResults.push({
            type:        "tool_result",                                // Anthropic result block type
            tool_use_id: toolCall.id,                                  // correlate with the tool_use block
            content:     JSON.stringify(result),                       // serialise result as string
          });
        }

        messages.push({ role: "user", content: toolResults });        // add tool results for next turn
      }

      emit({ type: "done" });                                          // signal stream is complete
      controller.close();                                              // close the ReadableStream
    },
  });
}
