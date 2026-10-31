#pragma once
#include <juce_javascript/juce_javascript.h>
#include "BinaryData.h"
class NativeEngine {
 juce::JavascriptEngine js;
public:
 NativeEngine(){js.maximumExecutionTime=juce::RelativeTime::seconds(15);auto r=js.execute("try {"+juce::String::fromUTF8(BinaryData::engine_js,BinaryData::engine_jsSize)+"} catch(e) { globalThis.__engineError = String(e)+String(e.stack); }"); if(js.evaluate("globalThis.__engineError").isString())throw std::runtime_error(js.evaluate("globalThis.__engineError").toString().toStdString());if(r.failed())throw std::runtime_error(r.getErrorMessage().toStdString());}
 juce::var call(juce::var request){auto json=juce::JSON::toString(request);juce::var args[]={json};juce::Result error=juce::Result::ok();auto raw=js.evaluate("nativeCall("+juce::JSON::toString(juce::var(json))+")",&error);if(error.failed())throw std::runtime_error(error.getErrorMessage().toStdString());auto response=juce::JSON::parse(raw.toString());if(!(bool)response["ok"])throw std::runtime_error(response["message"].toString().toStdString());return response["result"];}
};
