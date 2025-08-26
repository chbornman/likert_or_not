import { expect, test, describe } from "bun:test";
import { render, fireEvent, screen } from "@testing-library/react";
import LikertScale from "../LikertScale";

describe("LikertScale Component", () => {
  test("should render all scale options", () => {
    render(
      <LikertScale
        value={undefined}
        onChange={() => {}}
        minLabel="Strongly Disagree"
        maxLabel="Strongly Agree"
      />,
    );

    expect(screen.getByText("Strongly Disagree")).toBeDefined();
    expect(screen.getByText("Strongly Agree")).toBeDefined();
    // Check for number buttons
    expect(screen.getByText("1")).toBeDefined();
    expect(screen.getByText("5")).toBeDefined();
  });

  test("should call onChange when option is selected", () => {
    let calledWith: number | undefined = undefined;
    const handleChange = (value: number) => {
      calledWith = value;
    };

    render(<LikertScale value={undefined} onChange={handleChange} />);

    const option4 = screen.getByText("4");
    fireEvent.click(option4);

    // Type assertion needed for TypeScript
    expect(calledWith!).toEqual(4);
  });

  test("should display selected value", () => {
    const { rerender } = render(<LikertScale value={3} onChange={() => {}} />);

    // Check that button 3 has selected styling (scale-110 class)
    const button3 = screen.getByText("3");
    expect(button3.className).toContain("scale-110");

    rerender(<LikertScale value={5} onChange={() => {}} />);

    // Check that button 5 has selected styling
    const button5 = screen.getByText("5");
    expect(button5.className).toContain("scale-110");
  });

  test("should render with custom min/max values", () => {
    render(
      <LikertScale value={undefined} onChange={() => {}} min={0} max={10} />,
    );

    // Check for custom range buttons
    expect(screen.getByText("0")).toBeDefined();
    expect(screen.getByText("10")).toBeDefined();
  });

  test("should handle custom scale labels", () => {
    render(
      <LikertScale
        value={undefined}
        onChange={() => {}}
        minLabel="Very Poor"
        maxLabel="Excellent"
      />,
    );

    expect(screen.getByText("Very Poor")).toBeDefined();
    expect(screen.getByText("Excellent")).toBeDefined();
  });
});
