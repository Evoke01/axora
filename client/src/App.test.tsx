import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, test } from "vitest";
import App from "./App";

test("renders the get started onboarding flow", () => {
  render(
    <MemoryRouter initialEntries={["/start"]}>
      <App />
    </MemoryRouter>,
  );

  expect(screen.getByRole("heading", { name: /create the business and generate its website/i })).toBeInTheDocument();
  expect(screen.getByText(/business name/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /create business/i })).toBeInTheDocument();
});
