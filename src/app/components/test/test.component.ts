import { Component, inject } from '@angular/core';
import { LoadingComponent } from "../loading/loading.component";
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-test',
  imports: [LoadingComponent, MatButtonModule],
  templateUrl: './test.component.html',
  styleUrl: './test.component.scss'
})
export class TestComponent {

  http = inject(HttpClient)

  sendFakeRequest() {
    this.http.get('https://jsonplaceholder.typicode.com/todos/1?_delay=5')
      .subscribe((response) => {
        console.log(response);
      });
  }
}
