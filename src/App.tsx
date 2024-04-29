import './app.css';
import { useEffect } from 'react';
import Navbar from './components/NavBar';
import ClaimForm from './components/ClaimForm';

function App() {
  useEffect(() => {
    const circle = document.getElementById('body-bg-glow');

    const onMouseMove = (e: MouseEvent) => {
      if (!circle) return;
      // Calculate the center coordinates of the circle
      let centerX = e.pageX - (circle.offsetWidth / 2);
      let centerY = e.pageY - (circle.offsetHeight / 2);

      // Update the position of the circle based on the center coordinates
      circle.style.left = centerX + 'px';
      circle.style.top = centerY + 'px';
    }

    document.addEventListener('mousemove', onMouseMove);

    // Clean up the event listener when the component unmounts
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
    };
  }, []); 

  return (
    <>
      <Navbar />
      <div className="App">
        <div className="body-bg"></div>
        <div id="body-bg-glow" className="body-bg-glow"></div>
        <h1>Diamond Claim</h1>
        <ClaimForm />
      </div>
    </>
  );
}

export default App;
