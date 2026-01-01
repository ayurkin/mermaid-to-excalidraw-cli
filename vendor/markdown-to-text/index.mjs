export const removeMarkdown = (markdown, options = { listUnicodeChar: "" }) => {
  options = options || {};
  options.listUnicodeChar = Object.prototype.hasOwnProperty.call(
    options,
    "listUnicodeChar"
  )
    ? options.listUnicodeChar
    : false;
  options.stripListLeaders = Object.prototype.hasOwnProperty.call(
    options,
    "stripListLeaders"
  )
    ? options.stripListLeaders
    : true;
  options.gfm = Object.prototype.hasOwnProperty.call(options, "gfm")
    ? options.gfm
    : true;
  options.useImgAltText = Object.prototype.hasOwnProperty.call(
    options,
    "useImgAltText"
  )
    ? options.useImgAltText
    : true;
  options.preserveLinks = Object.prototype.hasOwnProperty.call(
    options,
    "preserveLinks"
  )
    ? options.preserveLinks
    : false;

  let output = markdown || "";

  output = output.replace(/^(-\s*?|\*\s*?|_\s*?){3,}\s*$/gm, "");

  try {
    if (options.stripListLeaders) {
      if (options.listUnicodeChar) {
        output = output.replace(
          /^([\s\t]*)([\*\-\+]|\d+\.)\s+/gm,
          `${options.listUnicodeChar} $1`
        );
      } else {
        output = output.replace(/^([\s\t]*)([\*\-\+]|\d+\.)\s+/gm, "$1");
      }
    }
    if (options.gfm) {
      output = output
        .replace(/\n={2,}/g, "\n")
        .replace(/~{3}.*\n/g, "")
        .replace(/~~/g, "")
        .replace(/`{3}.*\n/g, "");
    }
    if (options.preserveLinks) {
      output = output.replace(/\[(.*?)\][\[\(](.*?)[\]\)]/g, "$1 ($2)");
    }
    output = output
      .replace(/<[^>]*>/g, "")
      .replace(/^[=\-]{2,}\s*$/g, "")
      .replace(/\[\^.+?\](\: .*?$)?/g, "")
      .replace(/\s{0,2}\[.*?\]: .*?$/g, "")
      .replace(/\!\[(.*?)\][\[\(].*?[\]\)]/g, options.useImgAltText ? "$1" : "")
      .replace(/\[(.*?)\][\[\(].*?[\]\)]/g, "$1")
      .replace(/^\s{0,3}>\s?/g, "")
      .replace(/(^|\n)\s{0,3}>\s?/g, "\n\n")
      .replace(/^\s{1,2}\[(.*?)\]: (\S+)( \".*?\")?\s*$/g, "")
      .replace(
        /^(\n)?\s{0,}#{1,6}\s+| {0,}(\n)?\s{0,}#{0,} {0,}(\n)?\s{0,}$/gm,
        "$1$2$3"
      )
      .replace(/([\*_]{1,3})(\S.*?\S{0,1})\1/g, "$2")
      .replace(/([\*_]{1,3})(\S.*?\S{0,1})\1/g, "$2")
      .replace(/(`{3,})(.*?)\1/gm, "$2")
      .replace(/`(.+?)`/g, "$1")
      .replace(/\n{2,}/g, "\n\n");
  } catch (error) {
    console.error(error);
    return markdown;
  }
  return output;
};
