"use client";

import { useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button, Feedback } from "@/components/ui/primitives";
import type { PuzzleProps } from "./types";
import { useSubmit } from "./useSubmit";

type Card = PuzzleProps<"timeline">["puzzle"]["config"]["cards"][number];

export function Timeline({ puzzle, submit }: PuzzleProps<"timeline">) {
  const cards = puzzle.config.cards;
  const [order, setOrder] = useState(() => cards.map((c) => c.id));
  const [announce, setAnnounce] = useState("");
  const s = useSubmit(submit, "That sequence doesn't hold up. Something's out of place.");
  const byId = new Map(cards.map((c) => [c.id, c]));
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const move = (index: number, delta: number) => {
    const to = index + delta;
    if (to < 0 || to >= order.length) return;
    setOrder((o) => arrayMove(o, index, to));
    setAnnounce(`${byId.get(order[index]!)!.text} moved to position ${to + 1} of ${order.length}.`);
  };

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    setOrder((o) => arrayMove(o, o.indexOf(String(e.active.id)), o.indexOf(String(e.over!.id))));
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Earliest at the top. Drag the handle, or use the arrow buttons.</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <ol key={s.shake} className={`space-y-2 ${s.shake ? "fx-shake" : ""}`} aria-label="Timeline, earliest first">
            {order.map((id, i) => (
              <TimelineItem key={id} card={byId.get(id)!} index={i} total={order.length} move={move} />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      <p className="sr-only" aria-live="polite">{announce}</p>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" disabled={s.busy} onClick={() => s.run(order)}>
          {s.busy ? "Checking…" : "Submit timeline"}
        </Button>
        <div aria-live="polite">{s.feedback && <Feedback tone={s.feedback.tone}>{s.feedback.text}</Feedback>}</div>
      </div>
    </div>
  );
}

function TimelineItem({ card, index, total, move }: { card: Card; index: number; total: number; move: (i: number, d: number) => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-stretch gap-2 rounded-md border border-line bg-surface p-2 ${isDragging ? "z-10 shadow-xl ring-2 ring-uv" : ""}`}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Drag: ${card.source}, ${card.stamp}. Position ${index + 1} of ${total}.`}
        className="flex w-9 shrink-0 cursor-grab touch-none items-center justify-center rounded text-xl text-muted hover:bg-surface-2 active:cursor-grabbing"
      >
        ⠿
      </button>
      <div className="min-w-0 flex-1 py-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <span className="font-mono text-sm font-bold">{card.stamp}</span>
          <span className="text-xs tracking-wider text-muted uppercase">{card.source}</span>
        </div>
        <p className="text-sm">{card.text}</p>
      </div>
      <div className="flex shrink-0 flex-col gap-1">
        <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move earlier: ${card.text}`} className="h-8 w-9 rounded border border-line text-sm disabled:opacity-30">
          ▲
        </button>
        <button type="button" onClick={() => move(index, 1)} disabled={index === total - 1} aria-label={`Move later: ${card.text}`} className="h-8 w-9 rounded border border-line text-sm disabled:opacity-30">
          ▼
        </button>
      </div>
    </li>
  );
}
