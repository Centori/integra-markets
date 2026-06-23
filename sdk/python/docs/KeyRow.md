# KeyRow


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **str** |  | 
**name** | **str** |  | 
**prefix** | **str** |  | 
**scopes** | **List[str]** |  | 
**last_used_at** | **str** |  | 
**created_at** | **str** |  | 

## Example

```python
from integra_markets.models.key_row import KeyRow

# TODO update the JSON string below
json = "{}"
# create an instance of KeyRow from a JSON string
key_row_instance = KeyRow.from_json(json)
# print the JSON string representation of the object
print(KeyRow.to_json())

# convert the object into a dict
key_row_dict = key_row_instance.to_dict()
# create an instance of KeyRow from a dict
key_row_from_dict = KeyRow.from_dict(key_row_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


