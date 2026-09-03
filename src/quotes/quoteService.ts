import { quotes } from "./quotes";

let previousIndex = -1;

export function getRandomQuote(): string {
  if (quotes.length === 1) return quotes[0];

  let index = Math.floor(Math.random() * quotes.length);
  while (index === previousIndex) {
    index = Math.floor(Math.random() * quotes.length);
  }

  previousIndex = index;
  return quotes[index];
}
