# NewsRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**max_articles** | **int** | Maximum number of articles to return | [optional] 
**sources** | **List[str]** | Specific news sources to fetch from | [optional] 
**commodity_filter** | **str** | Filter for specific commodity | [optional] 
**hours_back** | **int** | Hours back to fetch news from | [optional] 
**enhanced_content** | **bool** | Enable full HTML content extraction and NLTK summarization | [optional] 
**max_enhanced** | **int** | Maximum number of articles to enhance with full content | [optional] 
**alert_frequency** | **str** | Alert frequency preference (realtime, daily, weekly) | [optional] 
**min_impact** | **str** | Minimum impact level for alerts (LOW, MEDIUM, HIGH) | [optional] 

## Example

```python
from integra_markets.models.news_request import NewsRequest

# TODO update the JSON string below
json = "{}"
# create an instance of NewsRequest from a JSON string
news_request_instance = NewsRequest.from_json(json)
# print the JSON string representation of the object
print(NewsRequest.to_json())

# convert the object into a dict
news_request_dict = news_request_instance.to_dict()
# create an instance of NewsRequest from a dict
news_request_from_dict = NewsRequest.from_dict(news_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


