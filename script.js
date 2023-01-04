'use strict'




class Workout {
date = new Date();
id = (Date.now() + '').slice(-10);
clicks = 0
    constructor(coords, distance, duration) {
        this.coords = coords;
        this.distance = distance;
        this.duration = duration;
    }
    _setDescription() {
        //    prettier-ignore
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} ${this.distance} km on ${months[this.date.getMonth()]} ${this.date.getDate()} (${this.date.getHours()} : ${this.date.getMinutes()})`;

    };
click(){
    this.clicks++;
}

}

class Running extends Workout {
    type = 'running'
    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    }

    calcPace () {
        // min/km
        this.pace = this.duration / this.distance;
        return this.pace;
    }

}

class Cycling extends Workout {
    type = 'cycling'
    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription();
    }

    calcSpeed (){
        // km/h
        this.speed = this.distance / (this.duration / 60);
        return this.speed;
    }
}

// APPLICATION ARCHITECTURE

const form = document.querySelector('.form');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const containerWorkouts = document.querySelector('.workouts');

const validationMsg = document.querySelector('.validation__msg');
const showSortBtn = document.querySelector('.show__sort__btns');
const sortContainer = document.querySelector('.sort__buttons__container');
const sortDivider = document.querySelector('.sort__divider');
const overViewBtn = document.querySelector('.overview__btn');
const clearAllBtn = document.querySelector('.clr__all__btn');
const confMsg = document.querySelector('.confirmation__msg');
const yesBtn = document.querySelector('.yes__button');
const noBtn = document.querySelector('.no__button');



class App {
    #map;
    #mapEvent;
    #mapZoomLevel = 13;
    #workouts = [];
    #markers = [];


    constructor () {
        // Get user's position
        this._getPosition();

        //get data from local storage
        this._getLocalStorage();

        //Attach event handlers
        form.addEventListener('submit', this._newWorkout.bind(this));
        inputType.addEventListener('change', this._toggleElevationField);
        containerWorkouts.addEventListener('click', this._handleWorkoutClick.bind(this));
        showSortBtn.addEventListener('click', this._toggleSortBtn.bind(this));
        clearAllBtn.addEventListener('click', this._showDeleteMsg);
        yesBtn.addEventListener('click', this._clearAll);
        noBtn.addEventListener('click', function () {
            confMsg.classList.add('msg__hidden');
        });
        sortContainer.addEventListener('click', this._sortAndRender.bind(this));


    };

    _handleWorkoutClick(e) {
        const workoutEl = e.target.closest('.workout');

        if (!workoutEl) return;

        const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id);

        const workoutIndex = this.#workouts.indexOf(workout);

        if (e.target.classList.contains('remove__btn'))  {
            this._removeWorkout(workoutEl, workoutIndex);

            this._setLocalStorage();
            return;
        }
        
        this.#map.setView(workout.coords, this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1,
            },
        });

//    using the public interface
//         workout.click();
    }

    _sortAndRender(e) {
        const element = e.target.closest('.sort__button');
        let currentDirection = 'descending' //default
        if (!element) return;

        const arrow = element.querySelector('.arrow');
        const type = element.dataset.type;

    //    set all arrows to default state (down)
        sortContainer.querySelectorAll('.arrow').forEach((e) => e.classList.remove('arrow__up'));

    //    get which direction to sort
        const typeValues = this.#workouts.map((workout) => {
            return workout[type];
        });

        const sortedAscending = typeValues.slice().sort(function (a, b) {
            return a - b;
        }).join('');

        const sortedDescending = typeValues.slice().sort(function (a, b) {
            return b - a;
        }).join('');

        // compare sortedAscending array with values from #workout array to check how are they sorted
    //    1. case 1 ascending
        if (typeValues.join('') === sortedAscending) {
            currentDirection = 'ascending';

            arrow.classList.add('arrow__up');
        };

    //    2. case 2 descending
        if (typeValues.join('') === sortedDescending) {
            currentDirection = 'descending';

            arrow.classList.remove('arrow__up');
        }

    //    sort main workouts array
        this._sortArray(this.#workouts, currentDirection, type)


    //    Re-Render
    // clear rendered workouts from DOM
     containerWorkouts.querySelectorAll('.workout').forEach((workout) => workout.remove());

        // clear workouts from map(to prevent bug in array order when deleting a single workout)
        this.#markers.forEach((marker) => marker.remove());

    //  clear array
    this.#markers = []
    //    render list all again sorted
        this.#workouts.forEach((workout) => {
            this._renderWorkout(workout)

            //creat new markers and render them on map
            this._renderWorkOutMarker(workout)
        })



    }

    _sortArray(array, currentDirection, type) {
    //    sort opposite to the currentDirection
     if (currentDirection === 'ascending') {
        array.sort(function (a, b) {
        return b[type] - a[type];
    });

};
     if (currentDirection === 'descending') {
        array.sort(function (a, b) {
        return a[type] - b[type]
    });
};
    }

    _getPosition() {
        if (navigator.geolocation)
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this),
                function () {
                    alert('Could not get your position');
                }
            );
};

    _loadMap (position) {

            // console.log(position);
            const {latitude} = position.coords;
            const {longitude} = position.coords;
            console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

            const coords = [latitude, longitude];

            this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

            L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(this.#map);

            // Handling clicks on map

            this.#map.on('click', this._showForm.bind(this));

        this.#workouts.forEach(work => {
            this._renderWorkOutMarker(work);
        });
        overViewBtn.addEventListener('click', this._overView.bind(this));

        };

    _showForm (mapE){
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
    };

    _hiddenForm() {
        //    Empty inputs
        inputDistance.value = inputCadence.value = inputDuration.value = inputElevation.value = '';

        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => (form.style.display = 'grid'), 1000);
    }


_toggleElevationField () {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');

};

_newWorkout(e) {
const validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp));

const allPositive = (...inputs) => inputs.every(inp => inp > 0);

//validation msg if inputs don't pass validation and hide msg after 4s
const display = function () {
    validationMsg.classList.add('msg__show');
    setTimeout(() => {
        validationMsg.classList.remove('msg__show');
    }, 4000);

};

const displayValidationMsg = display.bind(this);

    e.preventDefault();


    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value; //converting to number with +
    const duration = +inputDuration.value; //converting to number with +
    const {lat, lng} = this.#mapEvent.latlng;
    let workout;

    // If workout running, create running object
    if (type === 'running') {
        const cadence = +inputCadence.value;

    // Check if data is valid
    if (!validInputs(distance, duration, cadence) || !allPositive(distance, duration, cadence) )
return displayValidationMsg();

    workout = new Running([lat, lng], distance, duration, cadence);
    }
    // If workout cycling, create cycling object
if (type === 'cycling') {
    const elevation = +inputElevation.value;

    if (!validInputs(distance, duration, elevation) || !allPositive(distance, duration))
return displayValidationMsg()

    workout = new Cycling([lat, lng], distance, duration, elevation);

}

    // Render workout on map as marker
this._renderWorkOutMarker(workout);

    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on list
    this._renderWorkout(workout);


    //Hide form + clear input fields
    this._hiddenForm();

//    Set local storage
    this._setLocalStorage();


};
_renderWorkOutMarker(workout) {
    const layer = L.marker(workout.coords)
        .addTo(this.#map)
        .bindPopup(
            L.popup({
                maxWidth: 250,
                minWidth: 100,
                autoClose: false,
                closeOnClick: false,
                className: `${workout.type}-popup`,
            })
        )
        .setPopupContent(
            `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)

        .openPopup();

//    put the marker inside markers array
    this.#markers.push(layer);


}

    _renderWorkout(workout) {
        let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
    `;

        if (workout.type === 'running')
            html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
        <button class = "remove__btn">x</button>
      </li>
      `;

        if (workout.type === 'cycling')
            html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
        <button class = "remove__btn">x</button>

      </li>
      `;

        sortDivider.insertAdjacentHTML('afterend', html);

        this._setLocalStorage();
    };

    _removeWorkout(workoutEl, workoutIndex) {
    //    1. remove from list
        workoutEl.remove();

    //    2. remove from array
        this.#workouts.splice(workoutIndex, 1);

    //    3. remove from map
        this.#markers[workoutIndex].remove();

    //    4. remove from marker array
        this.#markers.splice(workoutIndex, 1);

    }



    _toggleSortBtn() {
        sortContainer.classList.toggle('zero__height');
    };

    _overView() {
    //    if there are no workouts return
        if (this.#workouts.length === 0) return;
        //    find lowest and highest lat and long to make map bounds that fit all markers
        const latitudes = this.#workouts.map(workout => {
            return workout.coords[0];
        });
        const longitudes = this.#workouts.map(workout => {
            return workout.coords[1];
        });
        const minLat = Math.min(...latitudes);
        const maxLat = Math.max(...latitudes);
        const minLong = Math.min(...longitudes);
        const maxLong = Math.max(...longitudes);

     // fit bounds with coordinate
        this.#map.fitBounds(
            [
                [maxLat, minLong],
                [minLat, maxLong],
            ],
            {padding: [70, 70] }
            );
    };

    _showDeleteMsg(){
        confMsg.classList.remove('msg__hidden');
    }

    _clearAll() {
        localStorage.clear();
        location.reload();
        confMsg.classList.add('msg__hidden');
}



_setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
};

    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem('workouts'));

        if (!data) return;

        this.#workouts = data;
        this.#workouts.forEach(work => {
            this._renderWorkout(work);
        });
    };

    reset() {
        localStorage.removeItem('workouts');
        location.reload();
    }

};
const app = new App();






