
# LexiconExplainRequest


## Properties

Name | Type
------------ | -------------
`text` | string
`commodity` | string
`includeRulebook` | boolean

## Example

```typescript
import type { LexiconExplainRequest } from '@integra-markets/sdk'

// TODO: Update the object below with actual values
const example = {
  "text": null,
  "commodity": null,
  "includeRulebook": null,
} satisfies LexiconExplainRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as LexiconExplainRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


