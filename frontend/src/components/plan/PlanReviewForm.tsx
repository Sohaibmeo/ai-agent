import { useState } from "react";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";

export function PlanReviewForm({
  planId,
  userId,
  onSubmit,
}: {
  planId?: string;
  userId?: string;
  onSubmit: (text: string) => Promise<void>;
}) {
  const [text, setText] = useState("Swap one snack to something savoury");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const disabled = !text.trim() || !planId || !userId;

  const handleSubmit = async () => {
    if (disabled) return;
    setIsSubmitting(true);
    try {
      await onSubmit(text.trim());
      setText("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <h3 className="text-lg font-semibold">Request a tweak</h3>
      <p className="text-sm text-muted-foreground">Tell the review agent what to change.</p>
      <Textarea
        className="mt-3"
        rows={3}
        placeholder="e.g. Make post-workout meal vegetarian and cheaper"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={isSubmitting}
      />
      <div className="mt-3 text-right">
        <Button onClick={handleSubmit} disabled={disabled || isSubmitting}>
          {isSubmitting ? "Sending" : "Send to review agent"}
        </Button>
      </div>
    </div>
  );
}
