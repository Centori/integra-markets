# PolymarketAuthenticationMeta


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**validated_by_app** | **bool** | True when the BYO credential is present and validated | [optional] [default to False]
**vendor_auth_still_required** | **bool** | True when the upstream vendor still performs auth | [optional] [default to False]
**app_manages_auth_replay** | **bool** | True when the connector replays the credential upstream | [optional] [default to False]
**message** | **str** | Human-readable summary of the authentication boundary | [optional] [default to '']

## Example

```python
from integra_markets.models.polymarket_authentication_meta import PolymarketAuthenticationMeta

# TODO update the JSON string below
json = "{}"
# create an instance of PolymarketAuthenticationMeta from a JSON string
polymarket_authentication_meta_instance = PolymarketAuthenticationMeta.from_json(json)
# print the JSON string representation of the object
print(PolymarketAuthenticationMeta.to_json())

# convert the object into a dict
polymarket_authentication_meta_dict = polymarket_authentication_meta_instance.to_dict()
# create an instance of PolymarketAuthenticationMeta from a dict
polymarket_authentication_meta_from_dict = PolymarketAuthenticationMeta.from_dict(polymarket_authentication_meta_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


