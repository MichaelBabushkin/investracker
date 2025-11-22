import { render, screen } from "@testing-library/react";
import Logo from "../Logo";

describe("Logo Component", () => {
  it("renders logo image with correct alt text", () => {
    render(<Logo />);
    const logo = screen.getByAltText("Investracker Logo");
    expect(logo).toBeInTheDocument();
  });

  it("renders Investracker text on larger screens", () => {
    render(<Logo />);
    const text = screen.getByText(/Investracker/i);
    expect(text).toBeInTheDocument();
  });

  it("renders as a link when linkTo is provided", () => {
    render(<Logo linkTo="/dashboard" />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/dashboard");
  });

  it("applies correct size classes based on size prop", () => {
    const { rerender } = render(<Logo size="sm" />);
    let logo = screen.getByAltText("Investracker Logo");
    expect(logo).toHaveAttribute("height", "32");
    expect(logo).toHaveAttribute("width", "32");

    rerender(<Logo size="md" />);
    logo = screen.getByAltText("Investracker Logo");
    expect(logo).toHaveAttribute("height", "40");
    expect(logo).toHaveAttribute("width", "40");

    rerender(<Logo size="lg" />);
    logo = screen.getByAltText("Investracker Logo");
    expect(logo).toHaveAttribute("height", "48");
    expect(logo).toHaveAttribute("width", "48");
  });

  it("does not render as link when linkTo is not provided", () => {
    render(<Logo linkTo="" />);
    const links = screen.queryAllByRole("link");
    expect(links).toHaveLength(0);
  });
});
