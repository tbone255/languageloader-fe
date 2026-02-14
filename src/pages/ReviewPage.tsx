/**
 * ReviewPage
 *
 * SRS review session using the new lesson schema.
 */

import SRSReview from '../components/SRSReview';

export default function ReviewPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-4xl font-bold">Review</h1>
        <p className="text-base-content/70">Strengthen your memory with spaced repetition</p>
      </div>
      <SRSReview />
    </div>
  );
}
