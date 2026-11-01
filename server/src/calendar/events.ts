import { ObjectId } from "mongodb";
import {
  COL,
  calendarRangeInput,
  createEventInput,
  deleteEventInput,
  updateEventInput,
  type CalendarEvent,
  type EventSummary,
} from "@reservation/shared";
import { secureCall } from "../lib/callable";
import { appError } from "../lib/errors";
import { getDb } from "../lib/mongo";

type EventDoc = CalendarEvent<Date> & { _id: string };

/** A person cannot pile up events without end. */
const MAX_EVENTS_PER_USER = 500;

async function events() {
  return (await getDb()).collection<EventDoc>(COL.events);
}

function toSummary(event: EventDoc): EventSummary {
  return { id: event._id, title: event.title, note: event.note, date: event.date, allDay: event.allDay, from: event.from, to: event.to };
}

/** An all-day event has no time of day: store it as the whole day. */
function times(data: { allDay: boolean; from: number; to: number }) {
  return data.allDay ? { from: 0, to: 24 * 60 } : { from: data.from, to: data.to };
}

/** Adds a private event to the signed-in user's calendar. */
export const createEvent = secureCall(
  { name: "createEvent", schema: createEventInput, rateLimit: { limit: 30, windowSec: 60 } },
  async ({ uid, data }) => {
    const col = await events();
    if ((await col.countDocuments({ userId: uid })) >= MAX_EVENTS_PER_USER) {
      throw appError("failed-precondition", "invalidInput", "Too many events: delete some first.");
    }
    const now = new Date();
    const event: EventDoc = {
      _id: new ObjectId().toHexString(),
      userId: uid,
      title: data.title,
      note: data.note,
      date: data.date,
      allDay: data.allDay,
      ...times(data),
      createdAt: now,
      updatedAt: now,
    };
    await col.insertOne(event);
    return { eventId: event._id };
  },
);

/** The signed-in user's events whose day is in the range, earliest first. */
export const listMyEvents = secureCall(
  { name: "listMyEvents", schema: calendarRangeInput, rateLimit: { limit: 60, windowSec: 60 } },
  async ({ uid, data }): Promise<EventSummary[]> => {
    const docs = await (await events())
      .find({ userId: uid, date: { $gte: data.from, $lte: data.to } })
      .sort({ date: 1, from: 1 })
      .limit(500)
      .toArray();
    return docs.map(toSummary);
  },
);

/** Changes one of the signed-in user's own events. */
export const updateEvent = secureCall(
  { name: "updateEvent", schema: updateEventInput, rateLimit: { limit: 30, windowSec: 60 } },
  async ({ uid, data }) => {
    const result = await (await events()).updateOne(
      { _id: data.eventId, userId: uid },
      { $set: { title: data.title, note: data.note, date: data.date, allDay: data.allDay, ...times(data), updatedAt: new Date() } },
    );
    if (result.matchedCount === 0) throw appError("not-found", "eventNotFound", "Event not found.");
    return { updated: true };
  },
);

/** Deletes one of the signed-in user's own events. */
export const deleteEvent = secureCall(
  { name: "deleteEvent", schema: deleteEventInput, rateLimit: { limit: 30, windowSec: 60 } },
  async ({ uid, data }) => {
    const result = await (await events()).deleteOne({ _id: data.eventId, userId: uid });
    if (result.deletedCount === 0) throw appError("not-found", "eventNotFound", "Event not found.");
    return { deleted: true };
  },
);
