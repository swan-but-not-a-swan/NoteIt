import { Text, TextStyle } from "react-native";
import { fonts } from "@/theme/fonts";

type Props = {
  text: string;
  style?: TextStyle;
};

type Segment = {
  text: string;
  bold: boolean;
  italic: boolean;
};

// Matches **bold**, *italic*, or _italic_ — deliberately just these two,
// not a full CommonMark parser. Picture-notes are short, so this covers
// what people actually reach for without pulling in a markdown dependency.
const TOKEN_PATTERN = /(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g;

function parseInlineMarkdown(text: string): Segment[] {
  return text.split(TOKEN_PATTERN).map((token) => {
    if (token.startsWith("**") && token.endsWith("**")) {
      return { text: token.slice(2, -2), bold: true, italic: false };
    }
    if (
      (token.startsWith("*") && token.endsWith("*")) ||
      (token.startsWith("_") && token.endsWith("_"))
    ) {
      return { text: token.slice(1, -1), bold: false, italic: true };
    }
    return { text: token, bold: false, italic: false };
  });
}

// Renders **bold** and *italic*/_italic_ spans inline within a block of
// picture-note text. Read-only — this is for displaying a saved note, not
// for editing one (the write side just sees the raw markdown as plain text).
export default function MarkdownText({ text, style }: Props) {
  const segments = parseInlineMarkdown(text);

  return (
    <Text style={style}>
      {segments.map((segment, index) => {
        if (segment.text.length === 0) return null;
        // Nested <Text> inherits fontFamily/size/color from the outer style
        // in RN, so plain and italic segments only need to add what's
        // different — italic never touches fontFamily, so it still renders
        // in whatever font the caller passed in, just skewed. Bold has to
        // swap the font file itself (fontWeight alone doesn't affect a
        // custom-loaded font that has no separate bold variant registered).
        if (segment.bold) {
          return (
            <Text key={index} style={{ fontFamily: fonts.interBold }}>
              {segment.text}
            </Text>
          );
        }
        if (segment.italic) {
          return (
            <Text key={index} style={{ fontStyle: "italic" }}>
              {segment.text}
            </Text>
          );
        }
        return <Text key={index}>{segment.text}</Text>;
      })}
    </Text>
  );
}
