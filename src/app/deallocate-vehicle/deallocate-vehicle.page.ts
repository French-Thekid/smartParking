import { Component, OnInit, Query } from '@angular/core';
import { Router } from '@angular/router';
import { Camera } from '@ionic-native/camera/ngx';
import { BarcodeScanner } from '@ionic-native/barcode-scanner/ngx';
import { AlertController } from '@ionic/angular';
import { QRScanner, QRScannerStatus } from '@ionic-native/qr-scanner/ngx';
import { Vibration } from '@ionic-native/vibration/ngx';

import { AngularFirestore, DocumentReference } from 'angularfire2/firestore';
import {
  o_userI,
  OccupiedUserService
} from '../services/occupied-user.service';
import { Observable } from 'rxjs';
import { p_spaceI } from '../services/parking-space.service';
import { flatMap } from 'rxjs/operators';
import { IfStmt } from '@angular/compiler';

@Component({
  selector: 'app-deallocate-vehicle',
  templateUrl: './deallocate-vehicle.page.html',
  styleUrls: ['./deallocate-vehicle.page.scss']
})
export class DeallocateVehiclePage implements OnInit {
  currentImage: any;
  scannedCode: string;
  License: string="";
  o_users: o_userI[];
  query: Query;
  docRef: DocumentReference;
  users: Observable<any[]>;
  ouser: o_userI;
  ouserID: string;

  constructor(
    private qrScanner: QRScanner,
    private alertController: AlertController,
    private barcodeScanner: BarcodeScanner,
    private router: Router,
    private camera: Camera,
    private vibration: Vibration,
    public afstore: AngularFirestore,
    private o_userService: OccupiedUserService
  ) { }
  ngOnInit() {
    this.o_userService.getO_Users().subscribe(res => {
      console.log('Occupied', res);
    });
  }
  back() {
    this.router.navigate(['admin-portal']);
  }
  scanBarcode() {
    this.barcodeScanner
      .scan()
      .then(barcodeData => {
        console.log('Barcode data', barcodeData);
        this.scannedCode = barcodeData.text;
        // this.vibration.vibrate(0.1);
        // this.popUp(this.scannedCode);

        this.vibration.vibrate(0.1);
        this.popUp(this.scannedCode);

        var snapshotResult = this.afstore.collection('o_users', ref => ref.where('userLicNbr', '==', this.scannedCode).limit(1)).snapshotChanges().pipe(flatMap(users => users));
        var subscripton = snapshotResult.subscribe(doc => {
          this.ouser = <o_userI>doc.payload.doc.data();
          this.docRef = doc.payload.doc.ref;

          subscripton.unsubscribe();
          console.log(this.ouser);

          this.afstore.collection('parkingSpace').doc(this.ouser.parkID).update({
            status: true,
            reserved: false
          });
          this.afstore.collection('reservation').doc(this.ouser.parkID).delete();
        });

        this.afstore.collection('o_users').doc(this.scannedCode).delete();

      })
      .catch(err => {
        console.log('Error', err);
      });
  }
  stall(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  async deallocate() {
    if((this.License=='')||(this.License.length!=6)){
      const alert = await this.alertController.create({
        header: 'Warning',
        subHeader: 'Invalid Input',
        message: 'Please enter a valid license plate number to continue',
        translucent: true,
        buttons: ['OK']
      });
      await alert.present();
    }
    else{
      
      localStorage.setItem("tem",'false');
      var snapshotResult = this.afstore.collection('o_users', ref => ref.where('userLicNbr', '==', this.License).limit(1)).snapshotChanges().pipe(flatMap(users => users));
      var subscripton = snapshotResult.subscribe(doc => {
        this.ouser = <o_userI>doc.payload.doc.data();
        this.docRef = doc.payload.doc.ref;

        subscripton.unsubscribe();
        console.log(this.ouser);
        var x = this.ouser.parkID.split('P');
        if(x!=null){
          var y = x[0];
          if(y=='G'){
              localStorage.setItem("tem",'true');
              console.log("tem INSIDE: ",JSON.parse(localStorage.getItem('tem')))
          }
          else{
            localStorage.setItem("tem",'false');
            console.log("tem INSIDE: ",JSON.parse(localStorage.getItem('tem')))
          }
        }
        this.afstore.collection('parkingSpace').doc(this.ouser.parkID).update({
          status: true,
          reserved: false
        });
        this.afstore.collection('reservation').doc(this.ouser.parkID).delete();
        
      });
      this.afstore.collection('o_users').doc(this.License).delete();

      console.log("tem: ",JSON.parse(localStorage.getItem('tem')))
      await this.stall(1000);
      if(JSON.parse(localStorage.getItem('tem'))==false){
        console.log("no such vehicle")
        this.Fail(this.License);
      }
      else if (JSON.parse(localStorage.getItem('tem'))==true){
        this.popUp(this.License);
        localStorage.setItem("tem",'false');
        this.vibration.vibrate(0.1);
      }

    }
  }

  async popUp(License) {
    const alert = await this.alertController.create({
      header: 'APMS Notification',
      subHeader: 'Vehicle with License Plate #: ' + License + ' removed',
      buttons: ['OK']
    });
    await alert.present();
    this.scannedCode = ''; //resetting
    this.License = ''; //resetting
  }
  async Fail(License) {
    const alert = await this.alertController.create({
      header: 'Error',
      subHeader: 'No Vehicle Found with license #: ' + License,
      buttons: ['OK']
    });
    await alert.present();
  }
}

/*
        async scanQRC(){
          this.qrScanner.prepare().then((status: QRScannerStatus) => {
            if (status.authorized) {
              // camera permission was granted
              this.popUp();


              // start scanning
              let scanSub = this.qrScanner.scan().subscribe((text: string) => {
                console.log('Scanned something', text);
                //this.scannedCode = scanSub;
                this.qrScanner.hide(); // hide camera preview
                scanSub.unsubscribe(); // stop scanning
              });

            } else if (status.denied) {
              // camera permission was permanently denied
              // you must use QRScanner.openSettings() method to guide the user to the settings page
              // then they can grant the permission from there
            } else {
              // permission was denied, but not permanently. You can ask for permission again at a later time.
            }
          })
          .catch((e: any) => console.log('Error is', e));


        }*/
