import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Auth from "./Auth";
import { ApiError } from "@/lib/api";

const mockLogin = vi.fn();
const mockSignup = vi.fn();

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    token: null,
    username: null,
    login: mockLogin,
    signup: mockSignup,
    logout: vi.fn(),
  }),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockToastError = vi.fn();
vi.mock("sonner", () => ({
  toast: { error: (...args: unknown[]) => mockToastError(...args), success: vi.fn() },
}));

function renderAuth() {
  return render(
    <MemoryRouter>
      <Auth />
    </MemoryRouter>
  );
}

describe("Auth", () => {
  beforeEach(() => {
    mockLogin.mockReset();
    mockSignup.mockReset();
    mockNavigate.mockReset();
    mockToastError.mockReset();
  });

  it("renders the sign-in form by default", () => {
    renderAuth();
    expect(screen.getByText("Welcome Back")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
  });

  it("toggles to sign-up mode", async () => {
    renderAuth();
    await userEvent.click(screen.getByText(/Don't have an account\?/));
    expect(screen.getByText("Create Account")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign Up" })).toBeInTheDocument();
  });

  it("calls login with entered credentials and navigates on success", async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    renderAuth();

    await userEvent.type(screen.getByPlaceholderText("username"), "testuser");
    await userEvent.type(screen.getByPlaceholderText("Password"), "secret123");
    await userEvent.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("testuser", "secret123");
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  it("shows an error toast and does not navigate when login fails", async () => {
    mockLogin.mockRejectedValueOnce(new ApiError(400, "Invalid credentials"));
    renderAuth();

    await userEvent.type(screen.getByPlaceholderText("username"), "testuser");
    await userEvent.type(screen.getByPlaceholderText("Password"), "wrongpass");
    await userEvent.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Invalid credentials");
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
