import * as THREE from 'three';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.119.1/examples/jsm/controls/OrbitControls.js';

const pointCloud = new THREE.Group();
const labelContainer = new THREE.Group(); // Container for labels
let scene1, renderer1, camera, raycaster, mouse;
let currentFilterTag = null;

function loadCSV(filePath) {
    fetch(filePath)
        .then(response => response.text())
        .then(data => parseCSV(data))
        .catch(error => console.error('Error loading CSV:', error));
}

/*function loadJSON(filePath) {
    fetch('data.json')
    .then(response => response.json())
    .then(data => {
        const colorData = data.colors;
        colorData.forEach(d => {
            geometry.vertices.push(
              new THREE.Vector3(vertex.x, vertex.y, vertex.z)
            );
          });
        })
        .catch(error => {
          console.error('Error loading JSON file', error);
        });

}*/

function parseCSV(csvData) {
    const uniqueTags = new Set();
    const geometry = new THREE.BoxGeometry(1,1,1)
    function makeInstance(geometry, x, y, z, color, hex, cluster_size, ref_cat, cluster_id) {
        const material = new THREE.MeshBasicMaterial({color: new THREE.Color(color)});
        const obj = new THREE.Mesh(geometry, material);
        obj.position.set(x, y, z);
        obj.rotation.x = Math.PI;
        obj.rotation.y = Math.PI;
        obj.userData.hex = hex;
        obj.userData.cluster_size = cluster_size;
        obj.userData.ref_cat = ref_cat;
        obj.userData.cluster_id = cluster_id;
        //obj.rotation.z = Math.PI;
        pointCloud.add(obj);
        return obj;
    }
    
    const lines = csvData.split('\n');
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const hex = values[0];
        const x = parseFloat(values[1]);
        const y = parseFloat(values[3]);
        const z = parseFloat(values[2]);
        const gs = parseFloat(values[4]);
        const cluster_size = (parseFloat(values[5]))*0.006;
        const pantone_hex = values[6];
        const pantone_name = values[7];
        const ref_cat = values[10];
        const cluster_id = values[9];
        const color = new THREE.Color(x/255, z/255, y/255);
        uniqueTags.add(cluster_id);

        const scale = cluster_size
        //geometry.setAttribute('position', new THREE.BufferAttribute(verticesArray, 3));

        makeInstance(geometry, x, y, z, color, hex, cluster_size, ref_cat, cluster_id).scale.set(scale, scale, scale);
    }
    const filterControls = document.getElementById('filter-controls');
    uniqueTags.forEach(tag => {
        const filterButton = document.createElement('button');
        filterButton.textContent = tag;
        filterButton.className = 'filter-button'; // Add the filter-button class
        filterButton.addEventListener('click', function() {
            filterByTag(tag);
        });
        filterControls.appendChild(filterButton);
    });
        scene1.add(pointCloud);
        scene1.add(labelContainer);
}

function filterByTag(tag) {
    // If the same tag is clicked again, remove the filter
    if (tag === currentFilterTag) {
        currentFilterTag = null;
    } else {
        currentFilterTag = tag;
    }

    // Hide all points
    pointCloud.children.forEach(point => {
        point.scale.set(0.5, 0.5, 0.5);
        point.opacity = .25;
        point.visible = true;
    });

    // Show points with the selected location tag or show all if no filter
    if (currentFilterTag) {
        pointCloud.children
            .filter(point => point.userData.cluster_id === currentFilterTag)
            .forEach(point => {
                point.scale.set(
                    point.userData.cluster_size*1.5,
                    point.userData.cluster_size*1.5,
                    point.userData.cluster_size*1.5
                    );
                point.opacity = 1;
                point.visible = true;
            });
    } else {
        pointCloud.children.forEach(point => {
            point.scale.set(point.userData.cluster_size, point.userData.cluster_size, point.userData.cluster_size);
            point.opacity = 1;
            point.visible = true;
        });
    }
}

function init() {
    scene1 = new THREE.Scene();
    const color = 0xFFFFFF;
    const light = new THREE.AmbientLight(0x404040, 3);
    scene1.add(light);
    camera = new THREE.PerspectiveCamera(1000, window.innerWidth / window.innerHeight, 0.1, 500);
    //camera.position.z = 50;
    //camera.lookAt(new THREE.Vector3(80, 60, -11));

    camera.position.set(-67.06889871705192, -5.518790672006688, 217.19214705619822);
    const target = new THREE.Vector3(-66.38593582915398, -5.006568506083229, 216.67138785417603);
    camera.lookAt(target);
    camera.rotation.set(0.7771338887377968, -0.7518112160981475, 0.5915251414732368);

    renderer1 = new THREE.WebGLRenderer({
        antialias: true
    });
    renderer1.setSize(window.innerWidth, window.innerHeight);
    //document.body.appendChild(renderer1.domElement);
    document.getElementById('canvas1').appendChild(renderer1.domElement);

    loadCSV('colorStats.csv');

    const controls = new OrbitControls(camera, renderer1.domElement);
    controls.target.set(80, 60, -11);
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Event listeners for mouseover and mouseout
    document.addEventListener('mousemove', onMouseMove, false);
    document.addEventListener('mouseout', onMouseOut, false);
    window.addEventListener( 'resize', onWindowResize );
}

function onMouseMove(event) {
    // Update the mouse position
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Raycast to find intersected objects
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(pointCloud.children, true);
    const enlargedImageContainer = document.getElementById('enlarged-image');
    if (intersects.length > 0 && intersects[0].object.userData) {
        const hoveredPoint = intersects[0].point;
        const {hex, cluster_size, cluster_id} = intersects[0].object.userData;
        const tooltip = document.getElementById('tooltip');
        tooltip.innerHTML = `<strong>ID:</strong> ${hex}<br>`;

        const distances = pointCloud.children.map(point => {
            const distance = point.position.distanceTo(hoveredPoint);
            return {point, distance};
        });

        distances.sort((a, b) => a.distance - b.distance);
        const nearestPoints = distances.slice(0, 10);
        //drawLines(hoveredPoint, nearestPoints);
        
        if (currentFilterTag != null && intersects[0].object.userData.locationTag === currentFilterTag){
            //const filePath = `${id}.jpg`;
            //enlargedImageContainer.innerHTML = `<img src="${filePath}" style="width: 100%; height: 100%;" />`;
            enlargedImageContainer.style.display = 'block';
            tooltip.style.display = 'block';

            const distances = pointCloud.children.map(point => {
                const distance = point.position.distanceTo(hoveredPoint);
                return { point, distance };
            });
            distances.sort((a, b) => a.distance - b.distance);
            const nearestPoints = distances.slice(0, 10);
            //displayImages(filePath);
            //drawLines(hoveredPoint, nearestPoints);


        }else if (currentFilterTag === null){
            //const filePath = `${id}.jpg`;
            //enlargedImageContainer.innerHTML = `<img src="${filePath}" style="width: 100%; height: 100%;" />`;
            enlargedImageContainer.style.display = 'block';
            tooltip.style.display = 'block';
        };

    } else {
        // Hide tooltip if no intersection or missing userData
        document.getElementById('tooltip').style.display = 'none';
        enlargedImageContainer.style.display = 'none';
    }
    /*console.log('Current Camera Settings:');
    console.log('Position:', camera.position);
    console.log('Rotation:', camera.rotation);
    console.log('Target:', camera.getWorldDirection(new THREE.Vector3()).add(camera.position));*/
}

function onMouseOut() {
    // Hide tooltip on mouseout
    document.getElementById('tooltip').style.display = 'none';
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer1.setSize( window.innerWidth, window.innerHeight );
}


function animate() {
    /*requestAnimationFrame(animate);
    //pointCloud.rotation.x += 0.001;
    //pointCloud.rotation.y += 0.001;
    pointCloud.children.forEach(point => {
        point.rotation.x += 0.001; // Rotate around X-axis
        point.rotation.y += 0.001; // Rotate around Y-axis
    });
    renderer.render(scene, camera);*/

    requestAnimationFrame(animate);
    const center = new THREE.Vector3();
    pointCloud.children.forEach(point => {
        center.add(point.position);
    });
    center.divideScalar(pointCloud.children.length);

    const axis = new THREE.Vector3(1, 1, 1); // YZ-axis
    const angle = 0.001; // Angle of rotation
    pointCloud.rotateOnWorldAxis(axis, angle); // Rotate around YZ-axis
    renderer1.render(scene1, camera);

}

init();
animate();
