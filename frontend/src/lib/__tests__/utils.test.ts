import { expect, test, describe } from "bun:test";
import { cn } from "../utils";

describe("Utils", () => {
  describe("cn (className utility)", () => {
    test("should merge class names correctly", () => {
      const result = cn("px-2 py-1", "px-4");
      expect(result).toBe("py-1 px-4");
    });

    test("should handle conditional classes", () => {
      const isActive = true;
      const isDisabled = false;
      
      const result = cn(
        "base-class",
        isActive && "active-class",
        isDisabled && "disabled-class"
      );
      
      expect(result).toBe("base-class active-class");
    });

    test("should handle undefined and null values", () => {
      const result = cn("base", undefined, null, "extra");
      expect(result).toBe("base extra");
    });

    test("should merge Tailwind classes properly", () => {
      const result = cn(
        "text-sm text-red-500",
        "text-lg text-blue-500"
      );
      expect(result).toBe("text-lg text-blue-500");
    });

    test("should handle arrays of classes", () => {
      const result = cn(["base", "extra"], "additional");
      expect(result).toBe("base extra additional");
    });
  });
});