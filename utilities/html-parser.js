/**
 * Utility to parse HTML text with safe formatting tags into DOM nodes.
 * Strips out attributes and unauthorized elements to prevent XSS.
 * 
 * @param {string} text - HTML string containing formatting tags.
 * @returns {Node[]|string} Array of DOM nodes or raw string.
 */
export function parseHtml(text) {
  if (!text) return "";
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${text}</div>`, "text/html");
    const container = doc.body.firstChild || doc.body;
    
    const allowedTags = new Set(["B", "STRONG", "I", "EM", "U", "BR", "SPAN", "#text"]);
    
    const sanitize = (node) => {
      const children = Array.from(node.childNodes);
      for (const child of children) {
        if (!allowedTags.has(child.nodeName)) {
          const textNode = document.createTextNode(child.textContent);
          node.replaceChild(textNode, child);
        } else {
          if (child.attributes) {
            for (let i = child.attributes.length - 1; i >= 0; i--) {
              child.removeAttribute(child.attributes[i].name);
            }
          }
          sanitize(child);
        }
      }
    };
    
    sanitize(container);
    return Array.from(container.childNodes);
  } catch (e) {
    console.warn("Failed to parse HTML formatting:", e);
    return text;
  }
}
