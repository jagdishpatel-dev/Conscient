"""
Small hand-labeled eval for the diary emotion classifier.

Run from backend/: python -m evals.emotion_eval

This isn't meant to be a rigorous benchmark -- it's a lightweight sanity
check + a concrete "how do you evaluate this" artifact: 20 short diary-style
entries, hand-labeled with the emotion a human would clearly assign, scored
against the model's top prediction.
"""

from collections import Counter

from app.services.emotion import classify_emotion

LABELED_EXAMPLES: list[tuple[str, str]] = [
    ("I got the promotion I've been working towards for two years!", "joy"),
    ("We danced in the kitchen until midnight, I haven't laughed that hard in months.", "joy"),
    ("My best friend surprised me with a visit after three years apart.", "joy"),
    ("I found out my grandmother passed away this morning.", "sadness"),
    ("Watching my kids grow up and move away leaves an ache I can't shake.", "sadness"),
    ("I keep replaying the breakup in my head and it still hurts just as much.", "sadness"),
    ("My landlord raised the rent again without any notice and I am livid.", "anger"),
    ("He lied to my face about where he was last night and I can't let it go.", "anger"),
    ("I am so sick of my coworker taking credit for my ideas in every meeting.", "anger"),
    (
        "The doctor said the test results won't be back until Friday and I can't stop shaking.",
        "fear",
    ),
    ("Walking home alone last night I kept hearing footsteps behind me.", "fear"),
    ("I am terrified about the surgery tomorrow morning.", "fear"),
    ("The leftovers in the office fridge smelled so bad I had to leave the room.", "disgust"),
    ("I can't believe he chews with his mouth open at every single meal.", "disgust"),
    ("Found mold growing all over the bread I bought yesterday, absolutely revolting.", "disgust"),
    ("I never expected to see my old teacher walk into the coffee shop today.", "surprise"),
    ("Opening the door to a surprise party I had absolutely no idea about.", "surprise"),
    ("The plot twist in the finale left me sitting in stunned silence.", "surprise"),
    ("Did laundry, answered some emails, and made dinner. Pretty ordinary Tuesday.", "neutral"),
    ("Took the usual route to work, nothing out of the ordinary happened today.", "neutral"),
]


def run_eval() -> None:
    correct = 0
    confusion: Counter[tuple[str, str]] = Counter()

    print(f"Running eval on {len(LABELED_EXAMPLES)} hand-labeled examples...\n")

    for text, expected in LABELED_EXAMPLES:
        predicted, score = classify_emotion(text)
        is_correct = predicted == expected
        correct += is_correct
        confusion[(expected, predicted)] += 1

        marker = "✓" if is_correct else "✗"
        print(f"{marker} expected={expected:<9} predicted={predicted:<9} "
              f"(score={score:.2f})  \"{text[:60]}...\"")

    accuracy = correct / len(LABELED_EXAMPLES)
    print(f"\nAccuracy: {correct}/{len(LABELED_EXAMPLES)} ({accuracy:.0%})")

    misclassified = {k: v for k, v in confusion.items() if k[0] != k[1]}
    if misclassified:
        print("\nMisclassifications (expected -> predicted: count):")
        for (expected, predicted), count in sorted(misclassified.items()):
            print(f"  {expected} -> {predicted}: {count}")


if __name__ == "__main__":
    run_eval()
