# ApiKeysApi

All URIs are relative to *https://api.integramarkets.app*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**createKeyApiKeysPost**](ApiKeysApi.md#createkeyapikeyspost) | **POST** /api/keys | Create Key |
| [**listKeysApiKeysGet**](ApiKeysApi.md#listkeysapikeysget) | **GET** /api/keys | List Keys |
| [**revokeKeyApiKeysKeyIdDelete**](ApiKeysApi.md#revokekeyapikeyskeyiddelete) | **DELETE** /api/keys/{key_id} | Revoke Key |



## createKeyApiKeysPost

> CreateKeyResponse createKeyApiKeysPost(createKeyRequest)

Create Key

### Example

```ts
import {
  Configuration,
  ApiKeysApi,
} from '@integra-markets/sdk';
import type { CreateKeyApiKeysPostRequest } from '@integra-markets/sdk';

async function example() {
  console.log("🚀 Testing @integra-markets/sdk SDK...");
  const api = new ApiKeysApi();

  const body = {
    // CreateKeyRequest
    createKeyRequest: ...,
  } satisfies CreateKeyApiKeysPostRequest;

  try {
    const data = await api.createKeyApiKeysPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **createKeyRequest** | [CreateKeyRequest](CreateKeyRequest.md) |  | |

### Return type

[**CreateKeyResponse**](CreateKeyResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listKeysApiKeysGet

> Array&lt;KeyRow&gt; listKeysApiKeysGet(userId)

List Keys

### Example

```ts
import {
  Configuration,
  ApiKeysApi,
} from '@integra-markets/sdk';
import type { ListKeysApiKeysGetRequest } from '@integra-markets/sdk';

async function example() {
  console.log("🚀 Testing @integra-markets/sdk SDK...");
  const api = new ApiKeysApi();

  const body = {
    // string
    userId: userId_example,
  } satisfies ListKeysApiKeysGetRequest;

  try {
    const data = await api.listKeysApiKeysGet(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **userId** | `string` |  | [Defaults to `undefined`] |

### Return type

[**Array&lt;KeyRow&gt;**](KeyRow.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## revokeKeyApiKeysKeyIdDelete

> { [key: string]: any; } revokeKeyApiKeysKeyIdDelete(keyId, userId)

Revoke Key

### Example

```ts
import {
  Configuration,
  ApiKeysApi,
} from '@integra-markets/sdk';
import type { RevokeKeyApiKeysKeyIdDeleteRequest } from '@integra-markets/sdk';

async function example() {
  console.log("🚀 Testing @integra-markets/sdk SDK...");
  const api = new ApiKeysApi();

  const body = {
    // string
    keyId: keyId_example,
    // string
    userId: userId_example,
  } satisfies RevokeKeyApiKeysKeyIdDeleteRequest;

  try {
    const data = await api.revokeKeyApiKeysKeyIdDelete(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **keyId** | `string` |  | [Defaults to `undefined`] |
| **userId** | `string` |  | [Defaults to `undefined`] |

### Return type

**{ [key: string]: any; }**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

