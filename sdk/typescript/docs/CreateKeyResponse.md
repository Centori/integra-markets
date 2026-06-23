
# CreateKeyResponse


## Properties

Name | Type
------------ | -------------
`id` | string
`key` | string
`prefix` | string
`name` | string
`createdAt` | string

## Example

```typescript
import type { CreateKeyResponse } from '@integra-markets/sdk'

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "key": null,
  "prefix": null,
  "name": null,
  "createdAt": null,
} satisfies CreateKeyResponse

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as CreateKeyResponse
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


