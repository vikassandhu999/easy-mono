import {AspectRatio, Image} from '@mantine/core';

const sample_images = [
    'https://drive.usercontent.google.com/id=1b5e2RpX7G74ozjH6PisxFXzWRHaKshvp',
    'https://drive.google.com/uc?export=view&id=1gziUkFHWmjlKy04nJgWyNDE_A70VDEOY',
    'https://drive.google.com/uc?export=view&id=10NCeN3HV4jp8uGY8oscNd9wsIJBe7KQt',
    'https://drive.google.com/uc?export=view&id=1XMBdkUkBY4hRuMnbIkZVIRApt4S3Kwxs',
    'https://drive.google.com/uc?export=view&id=1Mlsc1WO6SwCxbvWg1kNMOTAO4HR6j8Qj',
];
const ImageSelector = () => {
    return (
        <div>
            {sample_images.map((image, idx) => {
                return (
                    <AspectRatio
                        flex="0 0 100px"
                        key={`${idx}-img`}
                        ratio={1}
                    >
                        <Image
                            alt="Avatar"
                            src={image}
                        />
                    </AspectRatio>
                );
            })}
        </div>
    );
};

export default ImageSelector;
