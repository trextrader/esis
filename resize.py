from PIL import Image

def resize_image(input_path, output_path, target_height=800):
    img = Image.open(input_path)

    # Maintain aspect ratio
    aspect_ratio = img.width / img.height
    new_height = target_height
    new_width = int(new_height * aspect_ratio)

    resized = img.resize((new_width, new_height), Image.LANCZOS)
    resized.save(output_path)

    print(f"Saved resized image: {output_path} ({new_width}x{new_height})")


# Example usage
resize_image(
    "esis_chance_constraint_feasibility.png",
    "esis_chance_constraint_resized.png",
    target_height=800
)