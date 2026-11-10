"use client";

import type { Approach } from "@/lib/providers/shared";
import { MAX_INSTRUCTION_CHARS } from "@/lib/schema";

const CHIPS = [
  { label: "Beginner level", text: "Explain it like I'm a beginner, with no jargon." },
  { label: "Exam revision", text: "Help me revise for an exam: focus on the key points and definitions to remember." },
  { label: "Real-world example", text: "Give me a real-world example that makes it concrete." },
  { label: "Step by step", text: "Walk me through it step by step." },
];

const PLACEHOLDER = `For example:
Explain it like I'm a beginner
Focus on the cache part
Give me a real-world example`;

const APPROACHES: { value: Approach; label: string; hint: string }[] = [
  { value: "solve", label: "Solve it", hint: "Work through the questions step by step" },
  { value: "explain", label: "Explain the topic", hint: "Teach the ideas behind the slide" },
  { value: "hint", label: "Give me a hint first", hint: "A nudge, then the full solution when you want it" },
];

export default function InstructionBox({
  value,
  onChange,
  approach,
  onApproachChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  approach?: Approach;
  onApproachChange?: (a: Approach | undefined) => void;
  disabled?: boolean;
}) {
  // a chip adds its text, so chips can be combined; never past the limit
  function addChip(text: string) {
    if (value.includes(text)) return;
    const next = value.trim() ? `${value.trim()} ${text}` : text;
    onChange(next.slice(0, MAX_INSTRUCTION_CHARS));
  }

  const left = MAX_INSTRUCTION_CHARS - value.length;

  return (
    <div className="rounded-[28px] border border-line bg-white p-5 text-[#111] sm:p-6">
      {onApproachChange && (
        <fieldset className="mb-5">
          <legend className="text-lg font-semibold">
            How should I handle this slide? <span className="font-normal text-muted">(optional)</span>
          </legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {APPROACHES.map((a) => {
              const on = approach === a.value;
              return (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => onApproachChange(on ? undefined : a.value)}
                  disabled={disabled}
                  aria-pressed={on}
                  className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                    on ? "border-[#111] bg-butter" : "border-line bg-white hover:border-[#111]"
                  } disabled:cursor-not-allowed`}
                >
                  <span className="block font-semibold text-[#111]">{a.label}</span>
                  <span className="block text-sm text-muted">{a.hint}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-sm text-label">Leave these off and I’ll decide: questions get solved, lecture slides get explained.</p>
        </fieldset>
      )}

      <label htmlFor="instruction" className="text-lg font-semibold">
        Tell the AI what you need <span className="font-normal text-muted">(optional)</span>
      </label>

      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Quick picks">
        {CHIPS.map((c) => {
          const on = value.includes(c.text);
          return (
            <button
              key={c.label}
              type="button"
              onClick={() => addChip(c.text)}
              disabled={disabled || on}
              aria-pressed={on}
              className={`h-9 rounded-full border px-4 text-sm font-medium transition-colors ${
                on ? "border-[#111] bg-butter text-[#111]" : "border-line bg-white text-[#111] hover:border-[#111]"
              } disabled:cursor-default`}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <textarea
        id="instruction"
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, MAX_INSTRUCTION_CHARS))}
        maxLength={MAX_INSTRUCTION_CHARS}
        disabled={disabled}
        rows={3}
        placeholder={PLACEHOLDER}
        aria-describedby="instruction-count"
        className="mt-3 block w-full resize-y rounded-2xl border border-line bg-[#fafafa] px-4 py-3 text-[16px] leading-relaxed text-[#111] placeholder:text-label focus:border-[#111] focus:bg-white focus:outline-none disabled:opacity-60"
      />
      <div className="mt-2 flex items-center justify-between text-sm text-label">
        <span id="instruction-count" aria-live="polite">
          {left} characters left
        </span>
        {value && (
          <button type="button" onClick={() => onChange("")} disabled={disabled} className="font-medium text-[#111] hover:underline">
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
