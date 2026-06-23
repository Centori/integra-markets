
# AIChatRequest


## Properties

Name | Type
------------ | -------------
`messages` | Array&lt;{ [key: string]: string; }&gt;
`availableTools` | Array&lt;string&gt;
`commodity` | string
`mode` | string

## Example

```typescript
import type { AIChatRequest } from '@integra-markets/sdk'

// TODO: Update the object below with actual values
const example = {
  "messages": null,
  "availableTools": null,
  "commodity": null,
  "mode": null,
} satisfies AIChatRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as AIChatRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


