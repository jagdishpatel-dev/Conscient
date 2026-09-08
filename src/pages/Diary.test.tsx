import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Diary from "./Diary";
import { DiaryEntry } from "@/lib/api";

const mockList = vi.fn();
const mockCreate = vi.fn();

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    api: {
      listDiaryEntries: (...args: unknown[]) => mockList(...args),
      createDiaryEntry: (...args: unknown[]) => mockCreate(...args),
    },
  };
});

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    token: "fake-token",
    username: "tester",
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
  }),
}));

const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}));

const existingEntry: DiaryEntry = {
  _id: "1",
  user_id: "u1",
  title: "Existing entry",
  content: "Some existing content",
  ai_access: true,
  mood: null,
  mood_confidence: null,
  date: new Date().toISOString(),
};

describe("Diary", () => {
  beforeEach(() => {
    mockList.mockReset();
    mockCreate.mockReset();
    mockToastError.mockReset();
    mockToastSuccess.mockReset();
    mockList.mockResolvedValue([existingEntry]);
  });

  it("loads and displays existing entries", async () => {
    render(<Diary />);
    expect(await screen.findByText("Existing entry")).toBeInTheDocument();
    expect(mockList).toHaveBeenCalledWith("fake-token");
  });

  it("shows a validation error and does not call the API when fields are empty", async () => {
    render(<Diary />);
    await screen.findByText("Existing entry");

    await userEvent.click(screen.getByRole("button", { name: "Save Entry" }));

    expect(mockToastError).toHaveBeenCalledWith("Please fill in both title and content");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("saves a new entry and adds it to the list", async () => {
    const newEntry: DiaryEntry = {
      _id: "2",
      user_id: "u1",
      title: "New entry",
      content: "New content",
      ai_access: true,
      mood: null,
      mood_confidence: null,
      date: new Date().toISOString(),
    };
    mockCreate.mockResolvedValueOnce(newEntry);

    render(<Diary />);
    await screen.findByText("Existing entry");

    await userEvent.type(screen.getByPlaceholderText("Entry Title"), "New entry");
    await userEvent.type(
      screen.getByPlaceholderText("Write your thoughts..."),
      "New content"
    );
    await userEvent.click(screen.getByRole("button", { name: "Save Entry" }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith("fake-token", {
        title: "New entry",
        content: "New content",
        ai_access: true,
      });
    });

    expect(await screen.findByText("New entry")).toBeInTheDocument();
    expect(mockToastSuccess).toHaveBeenCalledWith("Diary entry saved");
  });
});
