const AWS = require('aws-sdk');

AWS.config.update({region: 'us-east-1'});
const dynamoDb = new AWS.DynamoDB.DocumentClient();

export async function handler(event) {
  // For our backend, we support three request types.
  // GET all packages
  // POST rating
  // POST downloads
  if (event.requestContext.http.method === 'GET') {
    switch (event.requestContext.http.path) {
      case '/modules':
        return await getModuleList();
      case "/rating":
          return await getRating(event);
    }
  }
  if (event.requestContext.http.method === 'PUT') {
    switch (event.requestContext.http.path) {
      case '/rating':
        return await putRating(event);
    }
  }
  if (event.requestContext.http.method === 'PATCH') {
    switch (event.requestContext.http.path) {
      case '/downloads':
        return await incrementDownloads(event);
    }
  }

  return {
    statusCode: 404,
    body: 'Not Found',
  }
}

async function getModuleList() {
  // Calls on dynamodb to get all entries from the VRCFT-Modules-Registry table
  const data = await dynamoDb.scan({
    TableName: 'VRCFT-Module-Entries',
  }).promise();

  // Remove the "RatingSum" attribute from the data
  data.Items.forEach((item) => {
    delete item.RatingSum;
  });

  // Returns the data as a JSON object
  return {
    statusCode: 200,
    body: JSON.stringify(data.Items),
  }
}

async function putRating(event) {
  const body = JSON.parse(event.body);
  const {UserId, ModuleId, Rating} = body;

  const data = await dynamoDb.get({
    TableName: 'VRCFT-Module-Entries',
    Key: {
      ModuleId,
    }
  }).promise();
  if (!data.Item) {
    return {
      statusCode: 404,
      body: 'Not Found',
    }
  }

  // Update or create the rating entry in VRCFT-Module-Ratings
  await dynamoDb.put({
    TableName: 'VRCFT-Module-Ratings',
    Item: {
      UserId,
      ModuleId,
      Rating,
    },
  }).promise();

  return {
    statusCode: 200,
    body: 'OK',
  }
}

async function getRating(event) {
  const body = JSON.parse(event.body);
  const {UserId, ModuleId} = body;

  // Get the rating entry from VRCFT-Module-Ratings
  const data = await dynamoDb.get({
    TableName: 'VRCFT-Module-Ratings',
    Key: {
      UserId,
      ModuleId,
    },
  }).promise();

  // If we didn't find a rating, return a 404
  if (!data.Item) {
    return {
      statusCode: 404,
      body: 'Not Found',
    }
  }

  // Return the rating
  return {
    statusCode: 200,
    body: JSON.stringify(data.Item),
  }
}

async function incrementDownloads(event) {
  const body = JSON.parse(event.body);
  const {ModuleId} = body;

  // Get the module entry from VRCFT-Module-Entries
  await dynamoDb.update({
    TableName: 'VRCFT-Module-Entries',
    Key: {
      ModuleId,
    },
    UpdateExpression: 'ADD Downloads :one',
    ExpressionAttributeValues: {
      ':one': 1,
    }
  }).promise();

  return {
    statusCode: 200,
    body: 'OK',
  }
}