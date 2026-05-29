# ArticleSummarizeRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**url** | **str** | URL of the article to summarize | 
**sentences** | **int** | Number of sentences in summary | [optional] [default to 5]
**commodity** | **str** | Specific commodity to focus on | [optional] 

## Example

```python
from integra_markets.models.article_summarize_request import ArticleSummarizeRequest

# TODO update the JSON string below
json = "{}"
# create an instance of ArticleSummarizeRequest from a JSON string
article_summarize_request_instance = ArticleSummarizeRequest.from_json(json)
# print the JSON string representation of the object
print(ArticleSummarizeRequest.to_json())

# convert the object into a dict
article_summarize_request_dict = article_summarize_request_instance.to_dict()
# create an instance of ArticleSummarizeRequest from a dict
article_summarize_request_from_dict = ArticleSummarizeRequest.from_dict(article_summarize_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


