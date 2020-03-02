window.onload = () => {
  // get user location
  navigator.geolocation.getCurrentPosition(function (position) {
    // debug info, display user coords, gps accuracy, and create google maps link
    document.getElementById('user-coords-lat').innerHTML = position.coords.latitude
    document.getElementById('user-coords-lng').innerHTML = position.coords.longitude
    document.getElementById('user-coords-acc').innerHTML = position.coords.accuracy
    document.getElementById('user-location-link').href = 'https://www.google.com/maps/search/?api=1&query=' + position.coords.latitude + ',' + position.coords.longitude

    /*
    // log user position
    console.log('User coordinates: ', position.coords.latitude, position.coords.longitude)
    console.log('GPS accuracy (meters): ', position.coords.accuracy)
    */

    // get bus stop locations, and on success do parsePlaces
    fetchPlaces(position.coords)
  },
  function error (msg) { console.log('Error retrieving position', error) },
  { enableHighAccuracy: true, maximumAge: 0, timeout: 27000 })

  /*
  // log rotation of device
  var userRotation = document.getElementById('user').getAttribute('rotation')
  setInterval(function () {
    console.log('User rotation: ', userRotation.x, userRotation.y)
  }, 3000)
  */
}

// fetch data from url and on success, do callback with userCoords as arg=
function fetchPlaces (userCoords) {
  var placesUrl = 'https://dev-bus-service.webplatformsunpublished.umich.edu/bus/stops?key=' + new URLSearchParams(window.location.search).get('busServiceApiKey')
  fetch(placesUrl)
  .then(r => {
    // parsePlaces(userCoords, r.json())
    return r.json()
  })
  .then(json => {
    parsePlaces(userCoords, json)
  })
}

// decide what bus stop nodes to display
function parsePlaces (userCoords, busStops) {
  var maxDistance = 0.25 // how close bus stop needs to be to user to be displayed
  var scaleFactor = 1 // how big the sign is in relation to distance

  // for each bus stop, if it is within the maxDistance, create a node for it
  busStops.forEach(function (element) {
    var distance = distanceBetweenCoords(element.lat, element.lng, userCoords.latitude, userCoords.longitude)

    if (distance <= maxDistance) {
      scale = scaleFactor

      createBusStopNode(element, scale, userCoords)

      // debug info
      console.log('Created ' + element.id + ' node! Distance: ' + distance.toFixed(5) + 'mi')
      console.log('Bus stop coordinates: ', element.lat, element.lng)

      document.getElementById('user-coords-display-text').innerHTML += '<br>Created ' + element.id + ' node! Distance: ' + distance.toFixed(5)
    }
  })

  // react to position changes
  updateSignLines()
}

// add bus stop node to aframe scene
function createBusStopNode (element, scale, userCoords) {
  const scene = document.querySelector('a-scene')

  // create node
  const node = document.createElement('a-entity')
  node.setAttribute('id', `busstop-${element.id}`)
  node.classList.add('busstop-node')
  node.setAttribute('gps-entity-place', `latitude: ${element.lat}; longitude: ${element.lng};`)
  scene.appendChild(node)

  // create sign image
  var imageWidth = 0.65634675
  var imageHeight = 1
  const sign = document.createElement('a-image')
  sign.setAttribute('src', 'images/bus-stop-sign.png')
  sign.setAttribute('position', `0 ${imageHeight * scale / 2} 0`)
  sign.setAttribute('scale', `${imageWidth * scale} ${imageHeight * scale}`)
  sign.setAttribute('opacity', 1)
  sign.setAttribute('look-at', '#user')
  node.appendChild(sign)

  // create sign id
  const signId = document.createElement('a-text')
  signId.setAttribute('value', `${element.id}`)
  signId.setAttribute('width', 8)
  signId.setAttribute('align', 'center')
  signId.setAttribute('position', '0 -0.32 1')
  sign.appendChild(signId)

  // create sign line
  const signLine = document.createElement('a-entity')
  signLine.setAttribute('id', `busstop-${element.id}-signline`)
  signLine.classList.add('busstop-signline')
  signLine.setAttribute('line', 'start: 0, 0, 0; end: 0 -1 0; color: yellow; opacity: 0.5') // placeholder position, is updated with updateSignLines
  node.appendChild(signLine)

  // create backdrop for labels
  const signLabelBackdrop = document.createElement('a-plane')
  signLabelBackdrop.setAttribute('material', 'color: #000; opacity: 0.7;')
  signLabelBackdrop.setAttribute('width', '2')
  signLabelBackdrop.setAttribute('height', '0.8')
  signLabelBackdrop.setAttribute('position', '0 1 0')
  signLabelBackdrop.setAttribute('scale', '1 1 1')
  sign.appendChild(signLabelBackdrop)

  // create distance label
  var distanceMeters = distanceBetweenCoords(element.lat, element.lng, userCoords.latitude, userCoords.longitude, 'meters').toFixed(1)
  const signDistanceLabel = document.createElement('a-text')
  signDistanceLabel.setAttribute('value', `${distanceMeters} m`)
  signDistanceLabel.setAttribute('width', 8)
  signDistanceLabel.setAttribute('align', 'center')
  signDistanceLabel.setAttribute('position', '0 0.17 1')
  signLabelBackdrop.appendChild(signDistanceLabel)

  // create walking time estimate label
  const signTimeLabel = document.createElement('a-text')
  signTimeLabel.setAttribute('value', `${timeToWalk(distanceMeters).toFixed(1)} min`)
  signTimeLabel.setAttribute('width', 8)
  signTimeLabel.setAttribute('align', 'center')
  signTimeLabel.setAttribute('position', '0 -0.17 1')
  signLabelBackdrop.appendChild(signTimeLabel)

  // add touch event
  // todo

  // set world position based on coords
  const config = { attributes: true };
  const callback = function(mutationsList, observer) {
    for(let mutation of mutationsList) {
      if (mutation.attributeName == "position") {
        node.object3D.position.normalize();
      }
    }
  }
  const observer = new MutationObserver(callback);
  observer.observe(node, config);
}

function updateSignLines () {
  // _initWatchGPS from library used as reference https://github.com/jeromeetienne/AR.js/blob/master/aframe/src/location-based/gps-camera.js#L121
  navigator.geolocation.watchPosition(pos => {
    // set new sign line destination
    Array.from(document.getElementsByClassName('busstop-signline')).forEach(e => {
      var lineStartPosition = e.parentElement.getAttribute('position')
      var userPos = document.getElementById('user').getAttribute('position')
      e.setAttribute('line', `start: 0, 0, 0; end: ${-lineStartPosition.x + userPos.x} -1 ${-lineStartPosition.z + userPos.z}; color: yellow; opacity: 0.5`)
    })
  }, err => {
    console.warn('ERROR(' + err.code + '): ' + err.message)
  }, {
    enableHighAccuracy: true,
    timeout: 27000,
    maximumAge: 0
  })
}

// utility functions

// https://stackoverflow.com/a/365853
function distanceBetweenCoords (lat1, lon1, lat2, lon2, units = 'miles') {
  var earthRadius

  switch (units) {
    case 'miles':
      earthRadius = 3958.8
      break
    case 'meters':
      earthRadius = 6.3781 * Math.pow(10, 6)
  }

  var dLat = degToRad(lat2 - lat1)
  var dLon = degToRad(lon2 - lon1)

  lat1 = degToRad(lat1)
  lat2 = degToRad(lat2)

  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2)
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadius * c
}

function degToRad (degrees) {
  return degrees * Math.PI / 180
}

function timeToWalk (meters) {
  var walkTimeMin = 84 // reasonable time in minutes to walk 1 meter
  return parseFloat(meters) / walkTimeMin
}
