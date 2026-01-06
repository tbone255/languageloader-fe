// LessonPage
// Purpose: Single route with internal state machine handling intro → exercises → completion

import { useParams } from 'react-router-dom';

const LessonPage = () => {
  const { lessonId } = useParams();

  return (
    <div>
      <h1>Lesson</h1>
      {/* TODO: Implement state machine for intro → exercises → completion for lesson {lessonId} */}
      {/* TODO: On completion, generate SRS cards once */}
    </div>
  );
};

export default LessonPage;
