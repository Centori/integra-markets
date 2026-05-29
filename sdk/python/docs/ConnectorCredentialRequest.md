# ConnectorCredentialRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**auth_type** | **str** | Credential mode: none, api_key, or bearer | [optional] [default to 'api_key']
**api_key** | **str** | User-provided API key or subscription token | [optional] 
**bearer_token** | **str** | User-provided bearer token | [optional] 
**api_key_header** | **str** | Header name used when auth_type is api_key | [optional] 
**persist_secret** | **bool** | Store the credential encrypted for future connector runs | [optional] [default to True]

## Example

```python
from integra_markets.models.connector_credential_request import ConnectorCredentialRequest

# TODO update the JSON string below
json = "{}"
# create an instance of ConnectorCredentialRequest from a JSON string
connector_credential_request_instance = ConnectorCredentialRequest.from_json(json)
# print the JSON string representation of the object
print(ConnectorCredentialRequest.to_json())

# convert the object into a dict
connector_credential_request_dict = connector_credential_request_instance.to_dict()
# create an instance of ConnectorCredentialRequest from a dict
connector_credential_request_from_dict = ConnectorCredentialRequest.from_dict(connector_credential_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


