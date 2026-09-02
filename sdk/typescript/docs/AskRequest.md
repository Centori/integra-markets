
# AskRequest


## Properties

Name | Type
------------ | -------------
`question` | string
`template` | string
`variables` | object
`commodity` | string
`maxToolCalls` | number

## Example

```typescript
import type { AskRequest } from '@integra-markets/sdk'

// TODO: Update the object below with actual values
const example = {
  "question": null,
  "template": null,
  "variables": null,
  "commodity": null,
  "maxToolCalls": null,
} satisfies AskRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as AskRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


