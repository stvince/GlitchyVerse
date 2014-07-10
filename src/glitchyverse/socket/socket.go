package socket

import (
	"fmt"
	"log"
	"runtime"
	"net/http"
	"github.com/gorilla/websocket"
	"glitchyverse/user"
	"encoding/json"
	"errors"
)

var sockets = make(map[*user.User]bool)

var upgrader = websocket.Upgrader{}

func Handler(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	
	if err != nil {
		if _, ok := err.(websocket.HandshakeError); !ok {
			log.Println(err)
		}
		return
	}
	
	user := user.NewUser(ws)
	defer user.Disconnect()
	
	for {
		_, rawMessage, err := ws.ReadMessage()
		if err != nil {
			break
		}
		
		err = handleMessage(user, rawMessage)
		if(err != nil) {
			log.Println(err)
			break
		}
	}
}

func handleMessage(user *user.User, rawMessage []byte) (err error) {
	defer func() {
		if r := recover(); r != nil {
            trace := make([]byte, 1024)
            runtime.Stack(trace, true)
			
			err = errors.New(fmt.Sprintf("%v\n===== Stack trace : =====\n%s", r, trace))
		}
	}()
	
	var message [2]interface{}
	err = json.Unmarshal(rawMessage, &message)
	if err != nil {
		return
	}
	
	methodName := message[0].(string)
	method, ok := methods[methodName]
	if !ok {
		return errors.New("Unknown method : " + methodName)
	}
	
	err = method(user, message[1])
	
	return
}

func toVec3(data interface{}) (r [3]float64) {
	d := data.([]interface{})
	for i, v := range d {
		r[i] = v.(float64)
	}
	return
}

func toVec4(data interface{}) (r [4]float64) {
	d := data.([]interface{})
	for i, v := range d {
		r[i] = v.(float64)
	}
	return
}

var methods = map[string]func(user *user.User, data interface{}) (err error) {
	"auth_answer": func(user *user.User, data interface{}) (err error) {
		d := data.(map[string]interface{})
		user.Connect(d["name"].(string), d["password"].(string))
		return
	},
	
	"update_propellers": func(user *user.User, data interface{}) (err error) {
		d := data.(map[string]interface{})
		user.UpdatePropellers(int64(d["id"].(float64)), d["power"].(float64))
		return
	},
	
	"update_doors": func(user *user.User, data interface{}) (err error) {
		d := data.(map[string]interface{})
		user.UpdateDoors(int64(d["id"].(float64)), d["state"].(float64))
		return
	},
	
	"update_position": func(user *user.User, data interface{}) (err error) {
		d := data.(map[string]interface{})
		user.UpdatePosition(toVec3(d["position"]), toVec3(d["rotation"]))
		return
	},
	
	// TODO better and unique way to update building, with boolean indicating if the building is freely updatable or not
	
	"build_query": func(user *user.User, data interface{}) (err error) {
		d := data.(map[string]interface{})
		user.AddBuilding(
			int64(d["type_id"].(float64)),
			toVec3(d["position"]),
			toVec3(d["size"]),
			toVec4(d["rotation"]),
		)
		return
	},
	
	"destroy_query": func(user *user.User, data interface{}) (err error) {
		user.DeleteBuilding(int64(data.(float64)))
		return
	},
	
	"move_item_query": func(user *user.User, data interface{}) (err error) {
		d := data.(map[string]interface{})
		user.MoveItem(
			int64(d["item_id"].(float64)),
			int64(d["building_id"].(float64)),
			int64(d["slot_group_id"].(float64)),
		)
		return
	},
	
	"achieve_building_query": func(user *user.User, data interface{}) (err error) {
		user.AchieveBuilding(int64(data.(float64)))
		return
	},
}

// TODO methods names to CamelCase