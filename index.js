import React, { useState, useEffect } from 'react';
import {
  Modal,
  Text,
  Alert,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import decode from 'urldecode';
import styles from './style'

let showModal;
let setShowModal;
let isLoading;
let setIsLoading;

export const Rave = props => {
  let button = props.button === undefined ?
  <TouchableOpacity style={props.btnStyles} onPress={() => setShowModal(true)}>
      <Text style={props.textStyles}>{props.buttonText}</Text>
  </TouchableOpacity>
  : props.button({ onPress: () => setShowModal(true) });

  [showModal, setShowModal] = useState(false);
  [isLoading, setIsLoading] = useState(false);
  [url, setURL] = useState();

  useEffect(()=>{
    setIsLoading(true)
    fetchURL();
    setIsLoading(false);
  },[props.txref]);

  const fetchURL = () => {
    let data = {
      ...props,
      PBFPubKey: props.raveKey,
      currency: props.currency || "NGN",
      country: props.country  || "NG",
      customer_phone: props.customerPhone || props.billingMobile,
      customer_firstname: props.customer_firstname || props.billingName,
      customer_email: props.customerEmail || props.billingEmail,
      customer_lastname: props.customer_lastname || "",
      redirect_url:"https://ravesandboxapi.flutterwave.com/redirection",
    };

    fetch("https://api.ravepay.co/flwv3-pug/getpaidx/api/v2/hosted/pay", {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
      .then(response => response.json())
      .then(response => {
        setIsLoading(false)
        setURL(response.data.link)
      })
      .catch(error => {
        setIsLoading(false)
        setURL("")
        Alert.alert(
          "Transaction Failed",
          "Please try again",
          [ { text: "OK", onPress: () => console.log(error) } ],
          { cancelable: false }
        );
      });
  }

  let Rave = {
    uri: url,
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
              if (data.url.includes("https://ravesandboxapi.flutterwave.com/redirection")){
                await messageRecived(props, data);
              }
            }
          }
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
        {button}
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
              if (data.url.includes("https://ravesandboxapi.flutterwave.com/redirection")){
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
        {button }
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
  } else if (data.url.includes('https://ravesandboxapi.flutterwave.com/redirection')) {
    let regex = /[?&]([^=#]+)=([^&#]*)/g,
      match = [];
    match = regex.exec(decode(data.url));
    if (match[1] === "flwref"){ // handle test
      response = {
        txRef: props.txref,
        flwRef: match[2] || ""
      }
    }
    else { // handle live
      let parsedRes = JSON.parse(decode(match[2]));
      response = {
        txRef: props.txref,
        flwRef: parsedRes.flwRef || "",
        status: parsedRes.status || "",
      };
    }
  } else {
    // handle exceptional cases
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