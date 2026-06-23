# LexiconExplainRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**text** | **str** | Text to analyze with the commodity lexicon | 
**commodity** | **str** | Commodity context to force during analysis | [optional] 
**include_rulebook** | **bool** | Include the underlying commodity rulebook in the response | [optional] [default to False]

## Example

```python
from integra_markets.models.lexicon_explain_request import LexiconExplainRequest

# TODO update the JSON string below
json = "{}"
# create an instance of LexiconExplainRequest from a JSON string
lexicon_explain_request_instance = LexiconExplainRequest.from_json(json)
# print the JSON string representation of the object
print(LexiconExplainRequest.to_json())

# convert the object into a dict
lexicon_explain_request_dict = lexicon_explain_request_instance.to_dict()
# create an instance of LexiconExplainRequest from a dict
lexicon_explain_request_from_dict = LexiconExplainRequest.from_dict(lexicon_explain_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


