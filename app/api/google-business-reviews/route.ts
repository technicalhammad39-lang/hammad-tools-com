import { NextResponse } from 'next/server';

const DETAILS_ENDPOINT = 'https://maps.googleapis.com/maps/api/place/details/json';

export async function GET() {
  try {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    const placeId = process.env.GOOGLE_PLACE_ID;

    if (!apiKey || !placeId) {
      return NextResponse.json(
        { error: 'Missing GOOGLE_PLACES_API_KEY or GOOGLE_PLACE_ID configuration.' },
        { status: 500 }
      );
    }

    const url = `${DETAILS_ENDPOINT}?place_id=${encodeURIComponent(placeId)}&fields=name,rating,user_ratings_total,reviews,url&reviews_sort=newest&key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(url, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch Google reviews.' }, { status: 502 });
    }

    const payload = await response.json();
    if (payload.status !== 'OK') {
      return NextResponse.json({ error: payload.error_message || 'Google API returned an error.' }, { status: 502 });
    }

    const result = payload.result || {};
    const reviews = Array.isArray(result.reviews)
      ? result.reviews.map((review: any) => ({
          authorName: review.author_name,
          authorPhoto: review.profile_photo_url,
          rating: review.rating,
          text: review.text,
          relativeTime: review.relative_time_description,
          time: review.time,
          authorUrl: review.author_url,
        }))
      : [];

    return NextResponse.json({
      businessName: result.name || 'Google Business',
      rating: result.rating || 0,
      totalRatings: result.user_ratings_total || 0,
      profileUrl: result.url || null,
      reviews,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unexpected error while fetching Google reviews.' }, { status: 500 });
  }
}

