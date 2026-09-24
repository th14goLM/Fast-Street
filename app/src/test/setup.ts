import '@testing-library/jest-dom/vitest';

// jsdom does not implement element scrolling.
Element.prototype.scrollTo = function scrollTo() {};
