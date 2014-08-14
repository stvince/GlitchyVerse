package socket

import (
	"fmt"
	"log"
	"runtime"
	"net/http"
	"strings"
	"github.com/gorilla/websocket"
	"glitchyverse/user"
	"encoding/json"
	"reflect"
	"errors"
)

var sockets = make(map[*user.User]bool)

var upgrader = websocket.Upgrader{}

type messageHandler struct {
	funcValue reflect.Value
	paramType reflect.Type
}

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
	
	stringMessage := string(rawMessage)
	hashIndex := strings.Index(stringMessage, "#")
	methodName := stringMessage[:hashIndex]
	rawData := []byte(stringMessage[hashIndex + 1:])
	
	method, ok := methods[methodName]
	if !ok {
		return errors.New("Unknown method : " + methodName)
	}
	
	paramValue := reflect.New(method.paramType)
	err = json.Unmarshal(rawData, paramValue.Interface())
	if err != nil {
		return
	}
	
	method.funcValue.Call([]reflect.Value{reflect.ValueOf(user), paramValue.Elem()})
	
	return
}

var methods = make(map[string]messageHandler)

func init() {
	addMethod := func(name string, method reflect.Value) {
		methods[name] = messageHandler {
			funcValue: method,
			paramType: method.Type().In(1),
		}
	}
	
	addMethod("authAnswer", reflect.ValueOf(func(user *user.User, data *struct {
		Name string
		Password string
	}) (err error) {
		user.Connect(data.Name, data.Password)
		return
	}))
	
	addMethod("updatePropellers", reflect.ValueOf(func(user *user.User, data *struct {
		Id int64
		Power float64
	}) (err error) {
		user.UpdatePropellers(data.Id, data.Power)
		return
	}))
	
	addMethod("updateDoors", reflect.ValueOf(func(user *user.User, data *struct {
		Id int64
		State float64
	}) (err error) {
		user.UpdateDoors(data.Id, data.State)
		return
	}))
	
	addMethod("updatePosition", reflect.ValueOf(func(user *user.User, data *struct {
		Position [3]float64
		Rotation [3]float64
	}) (err error) {
		user.UpdatePosition(data.Position, data.Rotation)
		return
	}))
	
	// TODO better and unique way to update building, with boolean indicating if the building is freely updatable or not
	
	addMethod("buildQuery", reflect.ValueOf(func(user *user.User, data *struct {
		TypeId int64
		Position [3]float64
		Size     [3]float64
		Rotation [4]float64
	}) (err error) {
		user.AddBuilding(data.TypeId, data.Position, data.Size, data.Rotation)
		return
	}))
	
	addMethod("destroyQuery", reflect.ValueOf(func(user *user.User, data int64) (err error) {
		user.DeleteBuilding(data)
		return
	}))
	
	addMethod("moveItemQuery", reflect.ValueOf(func(user *user.User, data *struct {
		ItemId      int64
		BuildingId  int64
		SlotGroupId int64
	}) (err error) {
		user.MoveItem(data.ItemId, data.BuildingId, data.SlotGroupId)
		return
	}))
	
	addMethod("achieveBuildingQuery", reflect.ValueOf(func(user *user.User, data int64) (err error) {
		user.AchieveBuilding(data)
		return
	}))
}