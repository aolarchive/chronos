package com.huffingtonpost.chronos.agent;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.annotation.JsonSubTypes.Type;

/**
 * For jackson gobbledygook below reference:
 *   http://programmerbruce.blogspot.ca/2011/05/deserialize-json-with-jackson-into.html
 */
@JsonIgnoreProperties(ignoreUnknown=true)
@JsonTypeInfo(use=JsonTypeInfo.Id.NAME, include=JsonTypeInfo.As.PROPERTY, property="type", visible=false)
@JsonSubTypes({
    @Type(value=CallableQuery.class, name="CallableQuery"),
    @Type(value=CallableQuery.class, name="SleepyCallableQuery"),
    @Type(value=CallableScript.class, name="CallableScript")
})
public abstract class PolymorphicCallableJobMixin {

}
