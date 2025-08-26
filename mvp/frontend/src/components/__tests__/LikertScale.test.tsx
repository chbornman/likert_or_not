import { expect, test, describe } from "bun:test";
import { render, fireEvent, screen } from "@testing-library/react";
import LikertScale from "../LikertScale";

describe("LikertScale Component", () => {
  const mockQuestion = {
    id: "q1",
    type: "likert" as const,
    text: "How satisfied are you with our service?",
    required: true,
    scale_labels: {
      "1": "Strongly Disagree",
      "2": "Disagree",
      "3": "Neutral",
      "4": "Agree",
      "5": "Strongly Agree"
    }
  };

  test("should render all scale options", () => {
    render(
      <LikertScale 
        question={mockQuestion}
        value=""
        onChange={() => {}}
      />
    );
    
    expect(screen.getByText("Strongly Disagree")).toBeDefined();
    expect(screen.getByText("Disagree")).toBeDefined();
    expect(screen.getByText("Neutral")).toBeDefined();
    expect(screen.getByText("Agree")).toBeDefined();
    expect(screen.getByText("Strongly Agree")).toBeDefined();
  });

  test("should call onChange when option is selected", () => {
    let selectedValue = "";
    render(
      <LikertScale 
        question={mockQuestion}
        value={selectedValue}
        onChange={(value) => { selectedValue = value; }}
      />
    );
    
    const agreeOption = screen.getByLabelText("Agree");
    fireEvent.click(agreeOption);
    
    expect(selectedValue).toBe("4");
  });

  test("should display selected value", () => {
    const { rerender } = render(
      <LikertScale 
        question={mockQuestion}
        value="3"
        onChange={() => {}}
      />
    );
    
    const neutralOption = screen.getByLabelText("Neutral");
    expect(neutralOption).toBeChecked();
    
    rerender(
      <LikertScale 
        question={mockQuestion}
        value="5"
        onChange={() => {}}
      />
    );
    
    const stronglyAgreeOption = screen.getByLabelText("Strongly Agree");
    expect(stronglyAgreeOption).toBeChecked();
  });

  test("should handle required validation", () => {
    render(
      <LikertScale 
        question={{ ...mockQuestion, required: true }}
        value=""
        onChange={() => {}}
      />
    );
    
    expect(screen.getByText("*")).toBeDefined();
  });

  test("should handle custom scale labels", () => {
    const customQuestion = {
      ...mockQuestion,
      scale_labels: {
        "1": "Very Poor",
        "2": "Poor",
        "3": "Average",
        "4": "Good",
        "5": "Excellent"
      }
    };
    
    render(
      <LikertScale 
        question={customQuestion}
        value=""
        onChange={() => {}}
      />
    );
    
    expect(screen.getByText("Very Poor")).toBeDefined();
    expect(screen.getByText("Excellent")).toBeDefined();
  });
});