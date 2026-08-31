// Renders a JSON-LD <script> tag. The data comes from our own schema
// builders (src/lib/seo/schema.ts), but underlying string fields (article
// titles, descriptions) are admin-authored dynamic content — JSON.stringify
// does not escape "</script>", so a title containing that literal sequence
// could break out of the tag. Escaping "<" to its unicode form neutralizes
// that without changing the parsed JSON value.
export function JsonLd({ data }: { data: object | object[] }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c')
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  )
}
