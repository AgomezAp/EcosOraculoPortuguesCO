import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
declare var particlesJS: any;
@Component({
  selector: 'app-particles',
  imports: [],
  templateUrl: './particles.component.html',
  styleUrl: './particles.component.css'
})
export class ParticlesComponent {
 constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get<any>('/particulas2.json').subscribe(
      (config) => {
        particlesJS('particles-js', config, function() {
          console.log('callback - particles.js config loaded');
        });
      },
      (error) => {
        console.error('Error loading particles.js config:', error);
      }
    );
  }
}
