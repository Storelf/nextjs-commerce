import { isObject } from '../type-guards';

export type JSONValue = string | number | boolean | JSONObject | JSONArray;
export interface JSONObject {
  [x: string]: JSONValue | undefined;
}
export interface JSONArray extends Array<JSONValue> {}

interface JSONApiLinks {
  first?: string;
  last?: string;
  prev?: string;
  next?: string;
}

interface JSONApiError {
  source: {
    pointer: string;
  };
  detail: string;
}

interface JSONApiRelationshipData {
  type: string;
  id: string;
}

interface JSONApiRelationships {
  [x: string]: {
    data: JSONApiRelationshipData | JSONApiRelationshipData[];
  };
}

interface JSONApiResource {
  id: string;
  type: string;
  attributes?: JSONObject;
  relationships?: JSONApiRelationships;
}

export interface JSONApiErrorsDocument {
  errors: JSONApiError[];
  meta?: JSONObject;
}

export type JSONApiDataDocument = {
  data: JSONApiResource | JSONApiResource[];
  meta?: JSONObject;
  links?: JSONApiLinks;
  included?: JSONApiResource[];
};

export function isJSONApiDocument(json: any): json is JSONApiDataDocument {
  const data = json?.data;

  if (Array.isArray(data)) {
    return data.every((item) => typeof item?.type === 'string');
  } else {
    return typeof data?.type === 'string';
  }
}

function camelize(value: string) {
  const a = value.toLowerCase().replace(/[-_\s.]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''));
  return a.substring(0, 1).toLowerCase() + a.substring(1);
}

function transformAttributes(attributes: JSONObject) {
  return Object.entries(attributes).reduce((acc, [key, value]): JSONObject => {
    if (isObject(value)) {
      return { ...acc, [camelize(key)]: transformAttributes(value) };
    }
    return { ...acc, [camelize(key)]: value };
  }, {});
}

interface RelationSignature {
  id: string;
  type: string;
  relation: string | number;
  parentId: string;
  parentType: string;
}

function includesRelationSignature(
  alreadyIncluded: RelationSignature[],
  relationSignature: RelationSignature
) {
  return alreadyIncluded.some(
    (included) =>
      included.id === relationSignature.id &&
      included.type === relationSignature.type &&
      included.relation === relationSignature.relation &&
      included.parentId === relationSignature.parentId &&
      included.parentType === relationSignature.parentType
  );
}

function deserializeRelationships(
  relationships: JSONApiRelationships | undefined,
  included: JSONApiResource[] | undefined,
  parentInfo: { id: string; type: string },
  alreadyIncluded: RelationSignature[]
): JSONObject {
  if (!relationships || !included || included.length === 0) {
    return {};
  }

  const relationKeys = Object.keys(relationships);
  return relationKeys.reduce((acc, relationKey) => {
    const relationData = relationships[relationKey]?.data;
    if (!relationData) {
      return acc;
    }

    const isSingular = !Array.isArray(relationData);
    const relationsToParse = isSingular ? [relationData] : relationData;
    // Picking resources for relations and adding them to `alreadyIncluded` is a separate step from deserializing them
    // so there would be no depth traversal of the circular dependencies one by one caused by not all relation entities
    // being added to `alreadyIncluded` before we go recursive with `deserializeResource`.
    const relationResources = relationsToParse
      .map((relation) => {
        const relationSignature = {
          id: relation.id,
          type: relation.type,
          relation: relationKey,
          parentId: parentInfo.id,
          parentType: parentInfo.type
        };

        if (includesRelationSignature(alreadyIncluded, relationSignature)) {
          return undefined;
        } else {
          alreadyIncluded.push(relationSignature);
        }

        // Notice that this does not include root resources from data. This MAY need fixing later on.
        return included.find(
          (includedResource) =>
            includedResource.type === relation.type && includedResource.id === relation.id
        );
      })
      .filter((item) => item !== undefined);
    if (relationResources.length === 0) {
      return acc;
    }
    const parsed = relationResources.map((resource) =>
      deserializeResource(resource, included, alreadyIncluded)
    );

    return { ...acc, [camelize(relationKey)]: isSingular ? parsed[0] : parsed };
  }, {});
}

function deserializeResource(
  resource: JSONApiResource,
  included: JSONApiResource[] | undefined,
  alreadyIncluded: RelationSignature[] = []
) {
  const attributes = resource.attributes ? transformAttributes(resource.attributes) : {};
  const relationships = deserializeRelationships(
    resource.relationships,
    included,
    { id: resource.id, type: resource.type },
    alreadyIncluded
  );

  return {
    id: resource.id,
    ...attributes,
    ...relationships
  };
}

function deserializeCollection(
  collection: JSONApiResource[],
  included: JSONApiResource[] | undefined
) {
  return collection.map((resource) => deserializeResource(resource, included));
}

export interface ParsedJSONApiData {
  data?: JSONObject | JSONObject[];
  meta?: JSONObject;
  links?: JSONApiLinks;
}

export const deserializeJSONApi = (document: JSONApiDataDocument) => {
  const result: ParsedJSONApiData = {
    data: Array.isArray(document.data)
      ? deserializeCollection(document.data, document.included)
      : deserializeResource(document.data, document.included)
  };
  if (document.meta) {
    result['meta'] = transformAttributes(document.meta);
  }
  if (document.links) {
    result['links'] = undefined;
  }

  return result;
};
