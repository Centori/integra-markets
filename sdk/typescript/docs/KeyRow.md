
# KeyRow


## Properties

Name | Type
------------ | -------------
`id` | string
`name` | string
`prefix` | string
`scopes` | Array&lt;string&gt;
`lastUsedAt` | string
`createdAt` | string

## Example

```typescript
import type { KeyRow } from '@integra-markets/sdk'

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "name": null,
  "prefix": null,
  "scopes": null,
  "lastUsedAt": null,
  "createdAt": null,
} satisfies KeyRow

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as KeyRow
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


