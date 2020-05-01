import React, { useState } from 'react';
import {
  Modal,
  Text,
  Alert,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StyleSheet
} from 'react-native';
import { WebView } from 'react-native-webview';
import decode from 'urldecode';
let showModal;
let setShowModal;
let isLoading;
let setIsLoading;

const styles = StyleSheet.create({
	loadingView: {
		position: 'absolute',
		height: '100%',
		width: '100%',
		justifyContent: 'center',
		alignItems: 'center',
		top: 0,
	},
	cancelButton: {
		position: 'absolute',
		top: 20,
		right: 20,
		backgroundColor: '#f5a623',
		borderRadius: 4,
		padding: 10,
		paddingTop: 7,
		paddingBottom: 7,
	},
	cancelText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
});

export const Rave = props => {
  
  [showModal, setShowModal] = useState(false);
  [isLoading, setIsLoading] = useState(false);
  //  this._onNavigationStateChange = this._onNavigationStateChange.bind(this)
  let Rave = {
    html: `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1">
          </head>
          <body onload="payWithRave()" style="background-color:#fff;height:100vh ">
            <form>
              <script src="https://api.ravepay.co/flwv3-pug/getpaidx/api/flwpbf-inline.js"></script>
            </form>
            <script>
              window.onload = payWithRave;
              function payWithRave() {
                var x = getpaidSetup({
                  PBFPubKey: "${props.raveKey}",
                  amount: "${props.amount}",
                  customer_phone: "${props.customerPhone || ''}",
                  customer_email: "${props.customerEmail || ''}",
                  custom_description: "${props.contentDescription}",
                  currency: "${props.currency || 'NGN'}",
                  custom_logo:"${props.custom_logo || ''}",
                  txref: "${props.txref}",
                  meta: "${props.meta || []}",
                  onclose: function(data) {
                    var resp = {event: "cancelled", data: {txRef: "${
                      props.txref
                    }", flwRef: data, status:""}};
                    window.ReactNativeWebView.postMessage(JSON.stringify(resp))
                  },
                   callback: function(response) {
                       var txref = response.tx.txRef;
                        if (
                          response.tx.chargeResponseCode == "00" ||
                          response.tx.chargeResponseCode == "0"
                      ) {
                           var resp = {event: "successful", data: {txRef: "${
                             props.txref
                           }", ...response}};
                      } else {
                        var resp = {event: "successful", data: {txRef: "${
                          props.txref
                        }", ...response}};
                        window.ReactNativeWebView.postMessage(JSON.stringify(resp))
                      }
                      x.close();
                 }
                });
              }
            </script>
          </body>
        </html>
      `,
  };
  if (Platform.OS === 'ios') {
    return (
      <View>
        <Modal
          visible={showModal}
          animationType="slide"
          transparent={false}
        >
          <WebView
            javaScriptEnabled={true}
            originWhitelist={['*']}
            source={Rave}
            onMessage={e => {
              messageRecived(props, e.nativeEvent.data);
            }}
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
            onNavigationStateChange={async data => {
              if (
                data.url.includes('https://api.ravepay.co') ||
                data.url.includes('https://ravesandboxapi.flutterwave.com')
              ) {
                await messageRecived(props, data);
              }
            }}
          />
          {/*Start of Loading modal*/}
          {isLoading === true && (
            <View
              style={styles.loadingView}
            >
              <ActivityIndicator
                size="large"
                color={props.ActivityIndicatorColor || '#f5a623'}
              />
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowModal(false);
                  setIsLoading(false);
                  props.onCancel();
                }}
              >
                <Text
                  style={styles.cancelText}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Modal>
        {props.button({ onPress: () => setShowModal(true) })}
      </View>
    );
  } else {
    return (
      <View>
        <Modal
          visible={showModal}
          animationType="slide"
          transparent={false}
        >
          <WebView
            javaScriptEnabled={true}
            originWhitelist={['*']}
            source={Rave}
            onMessage={e => {
              messageRecived(
                {
                  onCancel: props.onCancel,
                  onSuccess: props.onSuccess,
                  onError: props.onError,
                },
                e.nativeEvent.data,
              );
            }}
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
            onNavigationStateChange={async data => {
              if (
                data.url.includes('https://api.ravepay.co') ||
                data.url.includes('https://ravesandboxapi.flutterwave.com')
              ) {
                await messageRecived(props, data);
              }
            }}
          />
          {/*Start of Loading modal*/}
          {isLoading === true && (
            <View
              style={styles.loadingView}
            >
              <ActivityIndicator
                size="large"
                color={props.ActivityIndicatorColor || '#f5a623'}
              />
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowModal(false);
                  setIsLoading(false);
                  props.onCancel();
                }}
              >
                <Text
                  style={styles.cancelText}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Modal>
        {props.button({ onPress: () => setShowModal(true) })}
      </View>
    );
  }
};
const parseResponse = (props, data) => {
  let response = {
    txRef: props.txref,
    flwRef: '',
    status: '',
  };
  if (data.url === undefined) {
    // handle sandbox
    let url = new URL(data);
    response = {
      txRef: props.txref,
      flwRef: url.searchParams.get('ref'),
      status: url.searchParams.get('message'),
    };
  } else if (data.url.includes('https://ravesandboxapi.flutterwave.com')) {
    let regex = /[?&]([^=#]+)=([^&#]*)/g,
      params = {},
      match = [];
    let values = [];
    for (let i = 0; i < 4; i++) {
      match = regex.exec(data.url);
      values.push(match[2]);
    }
    response = {
      txRef: props.txref,
      flwRef: values[0],
      status: values[2],
    };
  } else {
    // handle live
    let regex = /[?&]([^=#]+)=([^&#]*)/g,
      params = {},
      match;
    match = regex.exec(decode(data.url));
    let parsedResp = JSON.parse(match[2]);
    response = {
      txRef: props.txref,
      flwRef: parsedResp.transactionreference,
      status: parsedResp.responsemessage,
    };
  }
  return response;
};
const messageRecived = async (props, data) => {
  let parsedData = typeof data === 'object' ? '' : JSON.parse(data);
  switch (parsedData.event) {
    case 'cancelled':
      await setShowModal(false);
      return props.onCancel(parsedData.data);
    case 'successful':
      await setShowModal(false);
      return props.onSuccess(parsedData.data);
    default:
      try {
        await setShowModal(false);
        await props.onSuccess(parseResponse(props, data));
      } catch (error) {
        console.log(error);
        await props.onError(`${data} || ${error}`);
      }
  }
};


