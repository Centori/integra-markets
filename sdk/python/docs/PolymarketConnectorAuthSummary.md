# PolymarketConnectorAuthSummary


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**auth_type** | **str** | Credential mode: none, api_key, or bearer | [optional] 
**api_key_header** | **str** | Header name when auth_type is api_key | [optional] 
**has_secret** | **bool** | Whether a credential is present | [optional] [default to False]
**masked_secret** | **str** | Masked preview of the credential | [optional] 
**persisted** | **bool** | Whether the credential is stored for reuse | [optional] 

## Example

```python
from integra_markets.models.polymarket_connector_auth_summary import PolymarketConnectorAuthSummary

# TODO update the JSON string below
json = "{}"
# create an instance of PolymarketConnectorAuthSummary from a JSON string
polymarket_connector_auth_summary_instance = PolymarketConnectorAuthSummary.from_json(json)
# print the JSON string representation of the object
print(PolymarketConnectorAuthSummary.to_json())

# convert the object into a dict
polymarket_connector_auth_summary_dict = polymarket_connector_auth_summary_instance.to_dict()
# create an instance of PolymarketConnectorAuthSummary from a dict
polymarket_connector_auth_summary_from_dict = PolymarketConnectorAuthSummary.from_dict(polymarket_connector_auth_summary_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


