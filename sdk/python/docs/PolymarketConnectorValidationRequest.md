# PolymarketConnectorValidationRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**connector** | [**PolymarketConnectorRequest**](PolymarketConnectorRequest.md) |  | 

## Example

```python
from integra_markets.models.polymarket_connector_validation_request import PolymarketConnectorValidationRequest

# TODO update the JSON string below
json = "{}"
# create an instance of PolymarketConnectorValidationRequest from a JSON string
polymarket_connector_validation_request_instance = PolymarketConnectorValidationRequest.from_json(json)
# print the JSON string representation of the object
print(PolymarketConnectorValidationRequest.to_json())

# convert the object into a dict
polymarket_connector_validation_request_dict = polymarket_connector_validation_request_instance.to_dict()
# create an instance of PolymarketConnectorValidationRequest from a dict
polymarket_connector_validation_request_from_dict = PolymarketConnectorValidationRequest.from_dict(polymarket_connector_validation_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


